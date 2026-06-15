# Layered Walks — Architecture & API (MVP)

**Status:** Planning artifact. Pairs with `01-database-schema.md` and `03-build-plan.md`.

---

## 1. Guiding principle

The MVP has exactly **three** hard problems. Everything else is commodity CRUD that
Supabase + Stripe give you almost for free. Spend your engineering risk budget here:

1. **The layered route engine** — your only real differentiator.
2. **Offline-first content + maps** — your "critical requirement," and the thing that
   silently breaks tourist trust if it's wrong.
3. **Paid-content protection** — if audio URLs leak, the marketplace has no moat.

Build a thin, boring shell around those three.

---

## 2. System overview

```
┌─────────────────────────────────────────────────────────────┐
│  React Native (Expo) app  — iOS + Android, one codebase       │
│  • expo-location (GPS geofencing)   • expo-av (audio)         │
│  • @rnmapbox/maps (+ offline tiles) • expo-sqlite / WatermelonDB (offline cache) │
│  • expo-file-system (asset cache)   • Stripe RN SDK           │
│  • PostHog RN (analytics)                                     │
└───────────────┬─────────────────────────────┬───────────────┘
                │ Supabase JS (RLS, JWT)        │ signed URLs / checkout
                ▼                               ▼
┌───────────────────────────────┐   ┌──────────────────────────┐
│  Supabase                      │   │  Edge Functions (Deno)    │
│  • Postgres 15 + PostGIS       │   │  • POST /routes/generate  │
│  • Auth (email, Google, Apple) │   │  • POST /checkout         │
│  • Storage (images)            │   │  • POST /stripe/webhook   │
│  • Auto REST + RPC             │   │  • POST /downloads/manifest│
│  • RLS = primary authz         │   │  • POST /creators/onboard │
└───────────────────────────────┘   │  • POST /tours/{id}/publish│
                │                    └─────────┬────────────────┘
                ▼                              ▼
   ┌─────────────────────┐        ┌──────────────────────────────┐
   │ Cloudflare R2        │        │ Stripe Connect (Express)      │
   │ • audio (large)      │        │ • destination charges         │
   │ • images (or Supa)   │        │ • application fee = platform  │
   └─────────────────────┘        │ • automatic transfers/payouts │
                                   └──────────────────────────────┘
            Mapbox: vector tiles, offline regions, directions/matrix API
```

**Why these choices (matching your PRD):** one Expo codebase = fastest path to both stores;
Supabase = Postgres + Auth + Storage + serverless in one box, so the "boring shell" is
mostly configuration; R2 = cheap egress for the heavy audio assets (Supabase Storage is
fine too — pick one, don't run both in MVP; see §9).

---

## 3. API surface

Two kinds of endpoints:

- **Direct Supabase (RLS-protected)** for ordinary reads/writes. No bespoke API layer —
  the RN client uses `supabase-js`; RLS policies *are* the authorization.
- **Edge Functions** for anything touching money, trust, signed assets, or the route
  algorithm. These run as service-role and enforce their own checks.

### 3.1 Direct (supabase-js + RLS)
| Intent | Call | Guard |
|---|---|---|
| Browse cities | `from('cities').select().eq('is_active',true)` | public |
| Browse published tours in a city | `from('tours').select(...).eq('city_id',X).eq('status','published')` | RLS |
| Search by theme | join `tour_themes`; trigram on `title` | public |
| Tour detail + preview stops | `tours` + `stops` (RLS returns preview-only pre-purchase) | RLS gate |
| Save / unsave | `saved_tours` upsert/delete | owner RLS |
| Update progress | `tour_progress` upsert | owner RLS |
| Write review | `reviews` insert | RLS: `has_purchased()` |
| Creator: CRUD draft tour/stops | `tours`,`stops`,`stop_images` | owner RLS |

### 3.2 Edge Functions
| Endpoint | Purpose | Notes |
|---|---|---|
| `POST /routes/generate` | Run the layered engine | body = `{city_id, theme_ids[], max_minutes, intensity, origin}` → ordered stop list + duration/distance. Optionally persists to `generated_routes`. |
| `POST /checkout` | Create Stripe PaymentIntent for a tour | validates tour is published & not already owned; computes split from `creator_profiles.revenue_share`; returns client secret. |
| `POST /stripe/webhook` | Source of truth for purchases | on `payment_intent.succeeded` → insert/flip `purchases.completed`, bump `purchase_count`, `total_earnings_cents`. Idempotent on event id. |
| `POST /downloads/manifest` | Issue offline bundle | re-checks `has_purchased()`; returns signed URLs (TTL ~ 7d) for every audio/image/map region of the tour; writes `tour_downloads`. |
| `POST /assets/sign` | Single signed URL (streaming fallback) | re-checks purchase; short TTL. |
| `POST /creators/onboard` | Stripe Express account link | creates/links account, returns onboarding URL; sets `payout_enabled` on `account.updated`. |
| `POST /tours/{id}/publish` | Moderated publish transition | admin-gated; `draft→in_review→published`; the only writer of `tours.status`. |

---

## 4. The layered route engine

**Input:** `city_id`, `theme_ids[]`, `max_minutes`, `intensity`, `origin {lng,lat}`.
**Output:** ordered `[stop_id…]` + `total_duration_min` + `total_distance_m`, fitting the
time budget, minimizing backtracking.

### MVP algorithm (heuristic, good enough — do NOT build a TSP solver)
1. **Candidate set (PostGIS, in-DB):** stops whose parent tour is `published`, in `city_id`,
   tagged with ≥1 requested theme, within a sane radius of `origin`. Score each by
   *theme overlap* (how many requested themes it matches) and proximity.
   ```sql
   -- sketch
   select s.id, s.location, s.dwell_time_sec,
          count(st.theme_id) as theme_hits,
          ST_Distance(s.location, :origin) as d
   from stops s
   join tours t on t.id = s.tour_id and t.status='published' and t.city_id=:city
   join stop_themes st on st.stop_id = s.id and st.theme_id = any(:themes)
   group by s.id
   order by theme_hits desc, d asc
   limit 40;
   ```
2. **Order greedily:** start at `origin`, repeatedly take the nearest unused high-score
   candidate (nearest-neighbour). This alone kills most backtracking.
3. **Budget fit:** accumulate `walk_time(prev→next) + dwell_time`. Stop adding when the
   running total would exceed `max_minutes`. Walk time from **Mapbox Matrix/Directions**
   (walking profile); cache the matrix per request.
4. **Backtracking guard:** reject a candidate if adding it increases total path length by
   more than a threshold ratio vs. the marginal value it adds.
5. **`intensity`** maps to max total distance and pace (easy/moderate/strenuous → m/min).

**Where it runs:** an Edge Function calling the DB for candidates + Mapbox for the matrix.
Stateless first; add `generated_routes` persistence for caching/analytics later.

**Honest scoping:** this is a heuristic, not optimal routing — and that's the right MVP
call. Label it as such; don't gold-plate. The upgrade path (V2) is a proper time-budgeted
orienteering solver, but only if user data shows the greedy routes feel wrong.

---

## 5. GPS-triggered playback (client)

- `expo-location` background geofencing: register each stop's `(location, trigger_radius_m)`
  as a region. On enter → autoplay that stop's audio (expo-av), show images + transcript.
- Debounce re-entries; honor manual pause/replay; never autoplay a stop the user already
  finished unless they ask.
- Battery: use geofencing (OS-batched), **not** a high-frequency location poll.
- All trigger logic reads from the **local cache**, so it works fully offline.

---

## 6. Offline-first strategy (the critical requirement)

**Model:** the app is offline-first for *owned* tours. Download = make a tour fully usable
with zero connectivity.

On "Download" the client calls `POST /downloads/manifest` and then caches:
| Asset | How |
|---|---|
| Tour + stops + images metadata | mirror rows into **expo-sqlite / WatermelonDB** |
| Audio files | `expo-file-system` download via signed URLs → local fs |
| Stop images | same |
| Map | **Mapbox offline region** for the route bbox (tiles cached on device) |

- **Sync model:** read-through cache. App reads local SQLite first; background-refreshes
  from Supabase when online. Writes the user makes offline (progress, review drafts) queue
  and flush on reconnect.
- **Re-validation:** `tour_downloads.expires_at` triggers a silent re-check of
  `has_purchased()` next time online (handles refunds without nuking offline UX mid-walk).
- **Storage hygiene:** show per-tour cache size; let users delete downloads.

---

## 7. Payments — Stripe Connect (Express)

**Account type:** Express (creators get a Stripe-hosted onboarding + dashboard; you stay
out of KYC). **Charge type:** *destination charge* with `application_fee_amount` =
platform cut, `transfer_data.destination` = creator's connected account.

Flow:
```
Creator onboarding:  app → /creators/onboard → Stripe account link → creator completes KYC
                     Stripe → account.updated webhook → set payout_enabled=true

Purchase:  app → /checkout (validate, compute split) → PaymentIntent(client_secret)
           app confirms with Stripe RN SDK
           Stripe → payment_intent.succeeded → /stripe/webhook
                  → purchases.completed (idempotent), bump aggregates
           transfer to creator handled by destination charge automatically
```

- **Split:** `application_fee = round(amount * (1 - creator.revenue_share))` (default 30%).
  Snapshot `platform_fee_cents` / `creator_amount_cents` onto the purchase row at capture.
- **Webhook is the only source of truth** for `completed`. The client's success callback is
  a UX hint, never the trigger to grant content.
- **Refunds:** Stripe refund → `charge.refunded` webhook → `purchases.refunded`; the partial
  unique index lets the user re-buy later.

---

## 8. Content protection (the moat)

Two independent layers — neither alone is sufficient:

1. **RLS** hides paid stop *rows* (narration text) from non-purchasers (`stop read gate`).
2. **Signed URLs** protect the *bytes*: audio/images live in a **private** bucket. Clients
   never get a public URL — only short-lived signed URLs from `/downloads/manifest` or
   `/assets/sign`, both of which re-check `has_purchased()` server-side.

Accept the reality: once a buyer has the audio on-device, a determined user can rip it.
The goal is to stop *casual* leakage and unauthenticated scraping, not DRM. Don't over-invest.

---

## 9. Decisions to lock before building

| # | Decision | Recommendation |
|---|---|---|
| 1 | One asset store, not two | **Pick R2 _or_ Supabase Storage.** Supabase Storage for MVP (one fewer integration, signed URLs built in); revisit R2 only if egress cost bites. |
| 2 | Route engine location | Edge Function (Deno) + PostGIS candidate query + Mapbox matrix. Stateless first. |
| 3 | Offline DB | WatermelonDB if you want sync niceties; raw expo-sqlite if you want simplicity. Lean **expo-sqlite** for MVP. |
| 4 | Subscriptions | **Out of MVP.** Per-tour purchase only. |
| 5 | Admin moderation UI | MVP = a minimal internal web page (or even Supabase dashboard + SQL) flipping `in_review→published`. Don't build a portal yet. |
| 6 | Push notifications | Out of MVP. |

---

## 10. Non-functional notes

- **Auth:** Supabase Auth with email + Google + Apple (Apple is mandatory for iOS App Store
  if you offer any third-party login). A `profiles` row is created on signup via a trigger
  on `auth.users`.
- **Analytics → north star:** instrument PostHog events `tour_purchased`, `tour_started`,
  `tour_completed` (fires when `tour_progress.percent` hits 100). "Completed paid tours" is
  derivable in-DB *and* in PostHog for cross-checking.
- **Observability:** Stripe webhook failures and route-engine errors are your two pager-worthy
  surfaces — log them loudly.
- **Cost shape:** Mapbox Matrix/Directions calls are the variable cost in the route engine;
  cache aggressively and cap candidate count (40) to bound per-request calls.
