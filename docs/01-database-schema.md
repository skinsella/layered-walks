# Layered Walks — Database Schema (MVP)

**Stack:** Postgres 15 + PostGIS 3, on Supabase (Auth + Storage + Edge Functions + RLS).
**Status:** Planning artifact. SQL is migration-ready but unreviewed against a live DB.

---

## 0. Design decisions (read first)

1. **Sellable unit = `tours`.** One creator per tour → clean Stripe Connect split, clean
   ratings, clean refunds. The "layered" composition happens by selecting/trimming
   **stops** within a creator's published tours to fit a user's time + theme constraints.
2. **`stops` are first-class theme-tagged content modules**, not just children of a tour.
   They carry their own themes/periods and geometry. This is what makes the route engine
   possible *and* what makes true cross-creator composition reachable in V2 with zero
   migration (only new RLS policies + a pricing model).
3. **Paid content is gated at the row level.** A stop's `narration_text` / `audio` /
   `images` are only visible to (a) the owning creator, or (b) a user who has a
   `completed` purchase of the parent tour. Free *preview* stops are flagged.
   Binary audio/image bytes are additionally protected by **signed URLs** issued by an
   Edge Function (RLS protects rows; signed URLs protect files — see architecture doc).
4. **Money is stored in integer minor units** (`*_cents`) + an ISO `currency` code.
   Never floats for money.
5. **All user-facing tables carry RLS.** Writes that touch money or trust
   (`purchases`, `payouts`, publish transitions) go through Edge Functions using the
   service role — never direct from the client.
6. **`auth.users` is canonical identity.** `profiles.id` is a 1:1 FK to it.

Tables marked **[core]** are required for the first runnable MVP. Tables marked
**[mvp+]** are still in MVP scope but can land in a later sprint without blocking launch.

---

## 1. Extensions & enums

```sql
create extension if not exists postgis;
create extension if not exists pgcrypto;     -- gen_random_uuid()
create extension if not exists pg_trgm;       -- fuzzy theme/tour search

create type tour_status      as enum ('draft', 'in_review', 'published', 'archived');
create type creator_status   as enum ('pending', 'approved', 'suspended');
create type difficulty_level as enum ('easy', 'moderate', 'strenuous');
create type purchase_status  as enum ('pending', 'completed', 'refunded', 'failed');
create type payout_status    as enum ('pending', 'in_transit', 'paid', 'failed');
```

---

## 2. Identity & preferences

### `profiles` **[core]**
```sql
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  avatar_url    text,
  home_city_id  uuid references cities(id) on delete set null,
  is_creator    boolean not null default false,
  -- scalar UX prefs (default duration, intensity, locale). Theme prefs are relational below.
  preferences   jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
```

### `user_preferred_themes` **[mvp+]**
```sql
create table user_preferred_themes (
  user_id  uuid not null references profiles(id) on delete cascade,
  theme_id uuid not null references themes(id) on delete cascade,
  primary key (user_id, theme_id)
);
```

### `creator_profiles` **[core]**
1:1 extension of `profiles` for users who publish. Keeps payout/earnings data isolated.
```sql
create table creator_profiles (
  id                   uuid primary key references profiles(id) on delete cascade,
  display_name         text not null,
  bio                  text,
  banner_url           text,
  status               creator_status not null default 'pending',
  -- Stripe Connect (Express) account; payouts blocked until onboarding done.
  stripe_account_id    text unique,
  payout_enabled       boolean not null default false,
  -- platform default is 70/30; admin may override per creator. 0.70 = creator keeps 70%.
  revenue_share        numeric(4,3) not null default 0.700
                         check (revenue_share between 0 and 1),
  -- denormalized aggregates, maintained by triggers/functions for cheap reads
  rating_avg           numeric(3,2) not null default 0,
  rating_count         integer not null default 0,
  total_earnings_cents bigint not null default 0,
  created_at           timestamptz not null default now()
);
```

---

## 3. Geography & taxonomy

### `cities` **[core]**
```sql
create table cities (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  country_code char(2) not null,                 -- ISO 3166-1 alpha-2
  slug        text not null unique,
  centroid    geography(Point, 4326) not null,    -- map default center
  boundary    geography(MultiPolygon, 4326),      -- for "is this stop in-city" checks
  timezone    text not null default 'UTC',        -- IANA tz, e.g. 'Europe/Dublin'
  is_active   boolean not null default false,     -- gate launch city-by-city
  created_at  timestamptz not null default now()
);
create index cities_centroid_gix on cities using gist (centroid);
create index cities_boundary_gix on cities using gist (boundary);
```

### `themes` **[core]**
The lenses: History, Economics, Architecture, Politics, Food, Literature, Hidden Gems.
```sql
create table themes (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  icon        text,                 -- icon name / emoji for UI
  sort_order  integer not null default 0
);
```

### `periods` **[mvp+]**
Historical-period tags (e.g. "Georgian", "Medieval", "Celtic Tiger").
```sql
create table periods (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  year_start integer,
  year_end   integer
);
```

---

## 4. Content: tours & stops

### `tours` **[core]**
```sql
create table tours (
  id               uuid primary key default gen_random_uuid(),
  creator_id       uuid not null references creator_profiles(id) on delete restrict,
  city_id          uuid not null references cities(id) on delete restrict,
  title            text not null,
  slug             text not null,
  summary          text,                         -- card blurb
  description      text,                          -- full marketing copy (free to read)
  cover_image_url  text,
  status           tour_status not null default 'draft',
  difficulty       difficulty_level not null default 'easy',
  est_duration_min integer,                       -- author estimate; engine can trim
  distance_meters  integer,                       -- computed from stop path
  price_cents      integer not null default 0 check (price_cents >= 0),
  currency         char(3) not null default 'EUR',
  language         text not null default 'en',
  is_featured      boolean not null default false,
  -- denormalized aggregates
  rating_avg       numeric(3,2) not null default 0,
  rating_count     integer not null default 0,
  purchase_count   integer not null default 0,
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (creator_id, slug)
);
create index tours_city_status_idx on tours (city_id, status);
create index tours_creator_idx     on tours (creator_id);
create index tours_title_trgm_idx  on tours using gin (title gin_trgm_ops);
```

### `tour_themes` **[core]**  (M:N)
```sql
create table tour_themes (
  tour_id  uuid not null references tours(id) on delete cascade,
  theme_id uuid not null references themes(id) on delete cascade,
  primary key (tour_id, theme_id)
);
create index tour_themes_theme_idx on tour_themes (theme_id);
```

### `stops` **[core]**
The atomic, geolocated, theme-tagged content module.
```sql
create table stops (
  id              uuid primary key default gen_random_uuid(),
  tour_id         uuid not null references tours(id) on delete cascade,
  creator_id      uuid not null references creator_profiles(id) on delete restrict, -- denorm for V2 cross-creator routing & RLS speed
  sequence        integer not null,              -- author's canonical order within tour
  title           text not null,
  description      text,                          -- short, may be free
  narration_text  text,                          -- PAID: transcript of audio
  location        geography(Point, 4326) not null,
  address         text,
  trigger_radius_m integer not null default 35,   -- GPS auto-trigger geofence
  dwell_time_sec  integer not null default 120,   -- expected time at stop (for budgeting)
  audio_path      text,                          -- storage key (NOT a public URL)
  audio_duration_sec integer,
  is_preview      boolean not null default false, -- free taster stop (ungated)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (tour_id, sequence)
);
create index stops_tour_idx     on stops (tour_id);
create index stops_location_gix on stops using gist (location);
```

### `stop_images` **[core]**
```sql
create table stop_images (
  id           uuid primary key default gen_random_uuid(),
  stop_id      uuid not null references stops(id) on delete cascade,
  storage_path text not null,                    -- storage key, signed on demand
  caption      text,
  sort_order   integer not null default 0,
  width        integer,
  height       integer
);
create index stop_images_stop_idx on stop_images (stop_id);
```

### `stop_themes` / `stop_periods` **[mvp+]**
Stop-level tagging powers the layered route engine and V2 cross-creator composition.
```sql
create table stop_themes (
  stop_id  uuid not null references stops(id) on delete cascade,
  theme_id uuid not null references themes(id) on delete cascade,
  primary key (stop_id, theme_id)
);
create table stop_periods (
  stop_id   uuid not null references stops(id) on delete cascade,
  period_id uuid not null references periods(id) on delete cascade,
  primary key (stop_id, period_id)
);
```

---

## 5. Commerce

### `purchases` **[core]**
Written only by the Stripe webhook Edge Function (service role).
```sql
create table purchases (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references profiles(id) on delete restrict,
  tour_id                  uuid not null references tours(id) on delete restrict,
  creator_id               uuid not null references creator_profiles(id) on delete restrict,
  stripe_payment_intent_id text unique,
  status                   purchase_status not null default 'pending',
  amount_cents             integer not null,
  platform_fee_cents       integer not null,     -- snapshot of split at purchase time
  creator_amount_cents     integer not null,
  currency                 char(3) not null default 'EUR',
  purchased_at             timestamptz,
  created_at               timestamptz not null default now()
);
-- a user owns a tour at most once (allow re-buy only after refund: partial unique)
create unique index purchases_user_tour_active_uidx
  on purchases (user_id, tour_id)
  where status in ('pending', 'completed');
create index purchases_user_idx    on purchases (user_id);
create index purchases_creator_idx on purchases (creator_id);
```

### `payouts` **[mvp+]**
With Stripe destination charges, transfers can be automatic; this table reconciles them.
```sql
create table payouts (
  id                 uuid primary key default gen_random_uuid(),
  creator_id         uuid not null references creator_profiles(id) on delete restrict,
  stripe_transfer_id text unique,
  amount_cents       bigint not null,
  status             payout_status not null default 'pending',
  period_start       date,
  period_end         date,
  created_at         timestamptz not null default now()
);
```

---

## 6. Engagement

### `reviews` **[core]**
One per user per tour; only purchasers may write. North-star inputs live partly here.
```sql
create table reviews (
  id              uuid primary key default gen_random_uuid(),
  tour_id         uuid not null references tours(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  rating_quality   smallint check (rating_quality   between 1 and 5),
  rating_accuracy  smallint check (rating_accuracy  between 1 and 5),
  rating_enjoyment smallint check (rating_enjoyment between 1 and 5),
  overall          smallint not null check (overall between 1 and 5),
  body            text,
  created_at      timestamptz not null default now(),
  unique (tour_id, user_id)
);
create index reviews_tour_idx on reviews (tour_id);
```

### `saved_tours` **[core]**  (bookmarks)
```sql
create table saved_tours (
  user_id    uuid not null references profiles(id) on delete cascade,
  tour_id    uuid not null references tours(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, tour_id)
);
```

### `tour_progress` **[core]**
Drives the **north-star metric: completed paid tours.**
```sql
create table tour_progress (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  tour_id       uuid not null references tours(id) on delete cascade,
  started_at    timestamptz not null default now(),
  completed_at  timestamptz,                     -- non-null = completed
  last_stop_id  uuid references stops(id) on delete set null,
  percent       smallint not null default 0 check (percent between 0 and 100),
  unique (user_id, tour_id)
);
create index tour_progress_user_idx on tour_progress (user_id);
```

### `tour_downloads` **[mvp+]**  (offline)
Records what a user has cached; `manifest` lists asset keys + the signed-URL TTL.
```sql
create table tour_downloads (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  tour_id       uuid not null references tours(id) on delete cascade,
  manifest      jsonb not null default '{}'::jsonb,
  downloaded_at timestamptz not null default now(),
  expires_at    timestamptz,                     -- re-validate gate after this
  unique (user_id, tour_id)
);
```

---

## 7. The layered route engine **[mvp+]**

A generated route is a **snapshot**: the engine selects + orders a subset of stops to fit
the user's constraints. Stored so it can be replayed, cached, and (V2) sold.

### `generated_routes`
```sql
create table generated_routes (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references profiles(id) on delete cascade,
  city_id            uuid not null references cities(id) on delete restrict,
  -- request snapshot: { theme_ids:[], max_minutes, intensity, origin:{lng,lat} }
  params             jsonb not null,
  total_duration_min integer,
  total_distance_m   integer,
  created_at         timestamptz not null default now()
);

create table generated_route_stops (
  route_id  uuid not null references generated_routes(id) on delete cascade,
  stop_id   uuid not null references stops(id) on delete restrict,
  sequence  integer not null,
  primary key (route_id, sequence)
);
```

> **MVP note:** the engine itself is a Postgres function / Edge Function (algorithm in the
> architecture doc). These tables only *persist* its output. You can ship the engine as a
> stateless endpoint first and add persistence when you want caching/analytics.

---

## 8. Denormalization maintenance

`tours.rating_avg/rating_count`, `creator_profiles.rating_avg/rating_count`,
`tours.purchase_count`, and `creator_profiles.total_earnings_cents` are denormalized for
cheap reads. Keep them correct with `AFTER INSERT/UPDATE/DELETE` triggers on `reviews`
and `purchases`. (Trigger bodies are a Sprint-1 task, not shown here — they're mechanical.)

---

## 9. Row-Level Security (the important part)

Enable RLS on **every** table, then add policies. Defaults deny.

```sql
alter table profiles            enable row level security;
alter table creator_profiles    enable row level security;
alter table tours               enable row level security;
alter table stops               enable row level security;
alter table stop_images         enable row level security;
alter table purchases           enable row level security;
alter table reviews             enable row level security;
alter table saved_tours         enable row level security;
alter table tour_progress       enable row level security;
-- ...and the rest
```

### Helper: does the current user own this tour?
```sql
create or replace function has_purchased(p_tour_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from purchases
    where user_id = auth.uid()
      and tour_id = p_tour_id
      and status  = 'completed'
  );
$$;
```

### Profiles
```sql
create policy "own profile rw" on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());
create policy "public reads creator profiles" on profiles
  for select using (is_creator = true);
```

### Tours — published is public; drafts are creator-only
```sql
create policy "published tours are public" on tours
  for select using (status = 'published');
create policy "creators manage own tours" on tours
  for all
  using   (creator_id = auth.uid())
  with check (creator_id = auth.uid());
```
> Status transition to `published` is **not** allowed directly — the publish Edge Function
> (service role) flips `draft → in_review → published` after admin moderation. Revoke
> `UPDATE(status)` from the client via a column-level grant or a `BEFORE UPDATE` guard.

### Stops — the content gate
```sql
-- Visible rows: preview stops of published tours, owner's own stops,
-- or all stops of a tour the user has purchased.
create policy "stop read gate" on stops
  for select using (
    creator_id = auth.uid()                                  -- owner
    or is_preview = true                                     -- free taster
    or has_purchased(tour_id)                                -- buyer
  );
create policy "creators write own stops" on stops
  for all using (creator_id = auth.uid()) with check (creator_id = auth.uid());
```
> Even when a row is visible, `narration_text` is text and `audio_path` is only a *key*.
> The bytes are fetched via a signed-URL Edge Function that re-checks `has_purchased()`.
> Belt **and** braces — see architecture doc §"Content protection".

### Purchases — read own, never client-write
```sql
create policy "read own purchases" on purchases
  for select using (user_id = auth.uid());
-- no insert/update/delete policy → only service role (webhook) can write
```

### Reviews — read public, write only if purchased
```sql
create policy "reviews are public" on reviews for select using (true);
create policy "purchasers write reviews" on reviews
  for insert with check (user_id = auth.uid() and has_purchased(tour_id));
create policy "edit own review" on reviews
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
```

### Saved / progress — owner only
```sql
create policy "own saves"    on saved_tours
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own progress" on tour_progress
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```

---

## 10. Entity-relationship overview

```
auth.users 1───1 profiles 1───0..1 creator_profiles
                    │                     │
                    │                     ├──< tours >── city
                    │                     │      │
                    │                     │      ├──< tour_themes >── themes
                    │                     │      └──< stops
                    │                     │              ├──< stop_images
                    │                     │              ├──< stop_themes  >── themes
                    │                     │              └──< stop_periods >── periods
                    │
   profiles ──< purchases >── tours          (one creator paid per purchase)
   profiles ──< reviews   >── tours
   profiles ──< saved_tours >── tours
   profiles ──< tour_progress >── tours
   profiles ──< tour_downloads >── tours
   profiles ──< generated_routes >──< generated_route_stops >── stops
   creator_profiles ──< payouts
```

---

## 11. Open questions for you

1. **Composition scope (the big one):** confirm MVP = "trim/reorder within *one* creator's
   tour(s)". If you actually want cross-creator routes in MVP, we need a revenue-split-per-
   route model now (materially bigger payments build).
2. **Subscription tier (§10 secondary):** in or out for MVP? Schema currently has no
   `subscriptions` table. Recommend **out** — keep MVP to per-tour purchase only.
3. **Multi-currency:** the schema carries `currency` everywhere but launch is Limerick/EUR.
   Fine to hard-default EUR for MVP; the columns mean V2 needs no migration.
4. **Period tags:** keep `periods` as a controlled list (current design) or free-text tags?
   Controlled list is better for the "Georgian / Economic history" filter UX in your example.
