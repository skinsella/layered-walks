# Layered Walks — MVP Build Plan

**Status:** Planning artifact. Pairs with `01-database-schema.md` + `02-architecture.md`.
**Goal:** ship a single-city (Limerick), per-tour-purchase, offline-capable, GPS-triggered
walking-tour app with a working layered route engine and 3 seeded flagship tours.

---

## 1. Sequencing philosophy

**De-risk the three hard things first, behind a thin shell.** Most teams build auth →
catalog → payments → *then* discover the route engine or offline sync doesn't work and the
whole premise wobbles. Invert it: prove the differentiator and the "critical requirement"
in spikes *before* polishing CRUD.

Two pre-sprint **spikes** (1 week total, throwaway code allowed) gate the plan:

- **Spike A — Route engine feasibility:** hard-code 15 Limerick stops, call
  PostGIS + Mapbox Matrix, produce a sane 60-min route. *Kill criterion:* if greedy routes
  feel obviously bad to a local, rethink before committing.
- **Spike B — Offline playback:** download one tour's audio + map region, fly into airplane
  mode, walk it, confirm GPS geofence autoplay works with zero signal. *This is the riskiest
  device-level unknown.*

If both spikes pass, the rest is execution.

---

## 2. Roadmap at a glance

| Sprint (2 wk) | Theme | Exit criterion |
|---|---|---|
| 0 | Spikes A & B + project setup | Both spikes pass; CI, Expo, Supabase project live |
| 1 | Data foundation + auth | Schema migrated w/ RLS; signup/login (email+Google+Apple); profile |
| 2 | Catalog + tour detail (read path) | Browse city → tours → tour detail with preview stops |
| 3 | Payments (Stripe Connect) | Buy a tour end-to-end; webhook grants content; refund works |
| 4 | Player: GPS + audio + offline | Owned tour downloads, plays offline, geofence autoplay |
| 5 | Route engine (productionized) | `/routes/generate` returns ordered route in-app |
| 6 | Creator portal + moderation + reviews | Creator builds/submits a tour; admin publishes; users rate |
| 7 | Seed content + polish + launch hardening | 3 flagship Limerick tours live; analytics; store builds |

**~16 weeks (4 months) to a Limerick launch** with one or two engineers. Compress by cutting
the creator portal (Sprint 6) to "internal tooling only" if you're seeding all content
yourself at launch (recommended — see §4).

---

## 3. Sprint detail

### Sprint 0 — Spikes & setup
- Spike A (route engine), Spike B (offline playback) — see §1.
- Expo app scaffold, Supabase project, Stripe test account, Mapbox account, PostHog project.
- CI: lint + typecheck + EAS build pipeline.
- **Exit:** both spikes green; a blank app boots on a real device via EAS.

### Sprint 1 — Data foundation + auth  *(core schema)*
- Apply migrations from `01-database-schema.md`: all **[core]** tables + RLS + the
  `auth.users → profiles` trigger + denormalization triggers on `reviews`/`purchases`.
- Auth: email, Google, Apple. Profile screen, preferences (scalar + theme picks).
- Seed `cities` (Limerick, `is_active=true`) and `themes` (7 lenses).
- **Exit:** a user can sign up, log in, set preferences; RLS verified with a non-owner token.

### Sprint 2 — Catalog & tour detail (read path)
- City browse, featured tours, theme search (trigram + `tour_themes`).
- Tour detail: marketing copy, map preview, **preview stops only** (proves the RLS gate),
  price, ratings summary.
- Save/unsave (`saved_tours`).
- **Exit:** unauthenticated/again-non-owner sees only preview stops; saved tours persist.

### Sprint 3 — Payments
- `/checkout`, `/stripe/webhook`, `/creators/onboard` Edge Functions.
- Stripe RN SDK purchase flow; idempotent webhook; split snapshot onto `purchases`.
- "My Tours" (owned) list; refund path → content revoked.
- **Exit:** buy in test mode → content unlocks via webhook (not client callback); refund
  re-locks; re-buy allowed.

### Sprint 4 — Player: GPS + audio + offline  *(the critical requirement)*
- `/downloads/manifest` (signed URLs, re-checks purchase); cache audio/images/map region.
- expo-sqlite mirror; read-through cache; offline progress queue.
- Geofence registration + autoplay/pause/replay; transcript view.
- `tour_progress` updates; completion fires at 100%.
- **Exit:** airplane-mode walk of an owned tour works fully; `tour_completed` event fires.

### Sprint 5 — Route engine (productionized)
- `/routes/generate` per architecture §4; in-app "build my walk" flow
  (location + time + themes + intensity → route preview → start).
- Persist to `generated_routes` for caching/analytics.
- **Exit:** a Limerick user generates a 60-min Georgian+Economic route that respects the
  time budget and doesn't backtrack absurdly.

### Sprint 6 — Creator portal + moderation + reviews
- Creator: map-based stop builder, audio/image upload, theme/period tags, dwell time,
  draft → submit (`in_review`).
- Admin moderation: minimal internal web page flipping `in_review → published`
  (`/tours/{id}/publish`). **Not** a polished portal.
- Reviews: 3-axis + overall, purchaser-gated; aggregates update.
- **Exit:** a creator builds a tour, admin publishes it, a buyer reviews it.

### Sprint 7 — Seed content + launch hardening
- Author the **3 flagship Limerick tours** (§4) using the Sprint-6 tooling.
- PostHog dashboards for north star + supporting metrics.
- Error handling, empty states, store assets, App Store / Play submissions (Apple login,
  privacy nutrition labels, background-location justification — start review early, it's slow).
- **Exit:** TestFlight/internal-track build with 3 real tours; metrics flowing.

---

## 4. Cold-start: seed it yourself (matches your risk mitigations)

Your PRD already names the right play — **own the flagship tours initially.** Concretely:

1. **The 3 launch tours** (your §17): *Limerick Georgian City*, *Limerick Economic
   Transformation*, *Hidden Limerick*. Your own economic-history expertise is the unfair
   advantage here — the Economic Transformation tour (Shannon, FDI, decline/recovery) is
   something no competitor can author.
2. Build them through the **same creator tooling** you ship — dogfooding finds the portal's
   sharp edges before any external creator hits them.
3. Defer the open marketplace (Launch Phase 3) until these prove completion + rating.

This lets you **cut Sprint 6's creator portal to internal-only** for launch and reclaim ~2
weeks — a legitimate MVP shortcut, since you don't need self-serve creators on day one.

---

## 5. What is deliberately NOT in this plan

Straight from your §8 exclusions, plus a few I'd add — all V2+:
social, creator subscriptions, live/group tours, AR, AI narration, comments, multi-language,
gamification, institution licensing, push notifications, multi-currency, cross-creator route
composition, a polished public creator portal, a custom admin dashboard.

If a feature isn't on the Sprint 0–7 list, it is not in the MVP. Guard this line hard — it's
the difference between a 4-month launch and a 12-month one.

---

## 6. Risk register (engineering)

| Risk | Likelihood | Mitigation |
|---|---|---|
| Offline geofence autoplay flaky on real devices | High | Spike B *first*; budget device-matrix testing in Sprint 4 |
| Greedy routes feel bad to locals | Medium | Spike A + local walkthroughs; route is a heuristic, label it so |
| Mapbox Matrix costs scale with usage | Medium | Cap candidates (40), cache matrices, persist routes |
| Stripe Connect onboarding friction | Medium | Express accounts; you onboard yourself first, feel the flow |
| App Store rejection (background location, login) | Medium | Apple login from Sprint 1; justify background location early; submit in Sprint 7 with buffer |
| Paid audio leakage | Low-Med | Private bucket + signed URLs + RLS; accept it's not DRM |
| Scope creep from §8 list | High | §5 hard line; every addition trades against launch date |

---

## 7. Definition of "MVP launched"

A curious visitor or local in Limerick can: open the app, pick themes + a time budget,
**either** buy one of three high-quality flagship tours **or** generate a layered route,
download it, walk it offline with GPS-triggered audio, complete it, and leave a rating —
and you can see "completed paid tours" climbing in PostHog.

Everything else waits.
