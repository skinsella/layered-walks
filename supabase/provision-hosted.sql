-- Layered Walks — one-shot provisioning for a HOSTED Supabase project.
-- Paste this whole file into the Supabase dashboard SQL editor and Run.
-- It applies every migration (0001–0010) in order, then the seed (Limerick,
-- lenses, demo creator, 3 published tours + stops). Idempotent-ish; safe to re-run.
-- Generated from supabase/migrations/*.sql + supabase/seed.sql.

-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: migrations/0001_extensions_and_enums.sql
-- ═══════════════════════════════════════════════════════════════════════════
-- 0001 — extensions + enums
-- See docs/01-database-schema.md §1.

create extension if not exists postgis;
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists pg_trgm;     -- fuzzy theme/tour search

create type tour_status      as enum ('draft', 'in_review', 'published', 'archived');
create type creator_status   as enum ('pending', 'approved', 'suspended');
create type difficulty_level as enum ('easy', 'moderate', 'strenuous');
create type purchase_status  as enum ('pending', 'completed', 'refunded', 'failed');
create type payout_status    as enum ('pending', 'in_transit', 'paid', 'failed');

-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: migrations/0002_geo_and_taxonomy.sql
-- ═══════════════════════════════════════════════════════════════════════════
-- 0002 — cities, themes, periods (must precede profiles, which FK cities)
-- See docs/01-database-schema.md §3.

create table cities (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  country_code char(2) not null,
  slug         text not null unique,
  centroid     geography(Point, 4326) not null,
  boundary     geography(MultiPolygon, 4326),
  timezone     text not null default 'UTC',
  is_active    boolean not null default false,
  created_at   timestamptz not null default now()
);
create index cities_centroid_gix on cities using gist (centroid);
create index cities_boundary_gix on cities using gist (boundary);

create table themes (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  icon        text,
  sort_order  integer not null default 0
);

create table periods (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  year_start integer,
  year_end   integer
);

-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: migrations/0003_identity.sql
-- ═══════════════════════════════════════════════════════════════════════════
-- 0003 — profiles, preferences, creator_profiles
-- See docs/01-database-schema.md §2.

create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text,
  avatar_url   text,
  home_city_id uuid references cities(id) on delete set null,
  is_creator   boolean not null default false,
  preferences  jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table user_preferred_themes (
  user_id  uuid not null references profiles(id) on delete cascade,
  theme_id uuid not null references themes(id) on delete cascade,
  primary key (user_id, theme_id)
);

create table creator_profiles (
  id                   uuid primary key references profiles(id) on delete cascade,
  display_name         text not null,
  bio                  text,
  banner_url           text,
  status               creator_status not null default 'pending',
  stripe_account_id    text unique,
  payout_enabled       boolean not null default false,
  revenue_share        numeric(4,3) not null default 0.700
                         check (revenue_share between 0 and 1),
  rating_avg           numeric(3,2) not null default 0,
  rating_count         integer not null default 0,
  total_earnings_cents bigint not null default 0,
  created_at           timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: migrations/0004_content.sql
-- ═══════════════════════════════════════════════════════════════════════════
-- 0004 — tours, stops and their tag bridges
-- See docs/01-database-schema.md §4.

create table tours (
  id               uuid primary key default gen_random_uuid(),
  creator_id       uuid not null references creator_profiles(id) on delete restrict,
  city_id          uuid not null references cities(id) on delete restrict,
  title            text not null,
  slug             text not null,
  summary          text,
  description      text,
  cover_image_url  text,
  status           tour_status not null default 'draft',
  difficulty       difficulty_level not null default 'easy',
  est_duration_min integer,
  distance_meters  integer,
  price_cents      integer not null default 0 check (price_cents >= 0),
  currency         char(3) not null default 'EUR',
  language         text not null default 'en',
  is_featured      boolean not null default false,
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

create table tour_themes (
  tour_id  uuid not null references tours(id) on delete cascade,
  theme_id uuid not null references themes(id) on delete cascade,
  primary key (tour_id, theme_id)
);
create index tour_themes_theme_idx on tour_themes (theme_id);

create table stops (
  id                 uuid primary key default gen_random_uuid(),
  tour_id            uuid not null references tours(id) on delete cascade,
  creator_id         uuid not null references creator_profiles(id) on delete restrict,
  sequence           integer not null,
  title              text not null,
  description        text,
  narration_text     text,
  location           geography(Point, 4326) not null,
  address            text,
  trigger_radius_m   integer not null default 35,
  dwell_time_sec     integer not null default 120,
  audio_path         text,
  audio_duration_sec integer,
  is_preview         boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (tour_id, sequence)
);
create index stops_tour_idx     on stops (tour_id);
create index stops_location_gix on stops using gist (location);

create table stop_images (
  id           uuid primary key default gen_random_uuid(),
  stop_id      uuid not null references stops(id) on delete cascade,
  storage_path text not null,
  caption      text,
  sort_order   integer not null default 0,
  width        integer,
  height       integer
);
create index stop_images_stop_idx on stop_images (stop_id);

create table stop_themes (
  stop_id  uuid not null references stops(id) on delete cascade,
  theme_id uuid not null references themes(id) on delete cascade,
  primary key (stop_id, theme_id)
);
create index stop_themes_theme_idx on stop_themes (theme_id);

create table stop_periods (
  stop_id   uuid not null references stops(id) on delete cascade,
  period_id uuid not null references periods(id) on delete cascade,
  primary key (stop_id, period_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: migrations/0005_commerce.sql
-- ═══════════════════════════════════════════════════════════════════════════
-- 0005 — purchases, payouts
-- See docs/01-database-schema.md §5.

create table purchases (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references profiles(id) on delete restrict,
  tour_id                  uuid not null references tours(id) on delete restrict,
  creator_id               uuid not null references creator_profiles(id) on delete restrict,
  stripe_payment_intent_id text unique,
  status                   purchase_status not null default 'pending',
  amount_cents             integer not null,
  platform_fee_cents       integer not null,
  creator_amount_cents     integer not null,
  currency                 char(3) not null default 'EUR',
  purchased_at             timestamptz,
  created_at               timestamptz not null default now()
);
-- A user may own a tour at most once while pending/completed; refunds free it up.
create unique index purchases_user_tour_active_uidx
  on purchases (user_id, tour_id)
  where status in ('pending', 'completed');
create index purchases_user_idx    on purchases (user_id);
create index purchases_creator_idx on purchases (creator_id);

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

-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: migrations/0006_engagement.sql
-- ═══════════════════════════════════════════════════════════════════════════
-- 0006 — reviews, saved_tours, tour_progress, tour_downloads
-- See docs/01-database-schema.md §6.

create table reviews (
  id               uuid primary key default gen_random_uuid(),
  tour_id          uuid not null references tours(id) on delete cascade,
  user_id          uuid not null references profiles(id) on delete cascade,
  rating_quality   smallint check (rating_quality   between 1 and 5),
  rating_accuracy  smallint check (rating_accuracy  between 1 and 5),
  rating_enjoyment smallint check (rating_enjoyment between 1 and 5),
  overall          smallint not null check (overall between 1 and 5),
  body             text,
  created_at       timestamptz not null default now(),
  unique (tour_id, user_id)
);
create index reviews_tour_idx on reviews (tour_id);

create table saved_tours (
  user_id    uuid not null references profiles(id) on delete cascade,
  tour_id    uuid not null references tours(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, tour_id)
);

create table tour_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  tour_id      uuid not null references tours(id) on delete cascade,
  started_at   timestamptz not null default now(),
  completed_at timestamptz,
  last_stop_id uuid references stops(id) on delete set null,
  percent      smallint not null default 0 check (percent between 0 and 100),
  unique (user_id, tour_id)
);
create index tour_progress_user_idx on tour_progress (user_id);

create table tour_downloads (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  tour_id       uuid not null references tours(id) on delete cascade,
  manifest      jsonb not null default '{}'::jsonb,
  downloaded_at timestamptz not null default now(),
  expires_at    timestamptz,
  unique (user_id, tour_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: migrations/0007_route_engine.sql
-- ═══════════════════════════════════════════════════════════════════════════
-- 0007 — generated route snapshots (the layered engine output)
-- See docs/01-database-schema.md §7 and docs/02-architecture.md §4.

create table generated_routes (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references profiles(id) on delete cascade,
  city_id            uuid not null references cities(id) on delete restrict,
  params             jsonb not null,  -- { theme_ids, max_minutes, intensity, origin }
  total_duration_min integer,
  total_distance_m   integer,
  created_at         timestamptz not null default now()
);

create table generated_route_stops (
  route_id uuid not null references generated_routes(id) on delete cascade,
  stop_id  uuid not null references stops(id) on delete restrict,
  sequence integer not null,
  primary key (route_id, sequence)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: migrations/0008_functions_and_triggers.sql
-- ═══════════════════════════════════════════════════════════════════════════
-- 0008 — functions + triggers (identity bootstrap, updated_at, denorm aggregates,
-- and the has_purchased() guard used by RLS). See docs/01-database-schema.md §8–9.

-- ── Create a profile row whenever an auth user is created ──────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── Generic updated_at touch ──────────────────────────────────────────
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch  before update on profiles for each row execute function touch_updated_at();
create trigger tours_touch     before update on tours    for each row execute function touch_updated_at();
create trigger stops_touch     before update on stops    for each row execute function touch_updated_at();

-- ── Purchase guard used throughout RLS ────────────────────────────────
create or replace function has_purchased(p_tour_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from purchases
    where user_id = auth.uid()
      and tour_id = p_tour_id
      and status  = 'completed'
  );
$$;

-- ── Denormalized rating aggregates on tours + creators ────────────────
create or replace function refresh_tour_ratings()
returns trigger language plpgsql as $$
declare v_tour uuid := coalesce(new.tour_id, old.tour_id);
begin
  update tours t set
    rating_avg   = coalesce((select avg(overall) from reviews where tour_id = v_tour), 0),
    rating_count = (select count(*) from reviews where tour_id = v_tour)
  where t.id = v_tour;

  update creator_profiles c set
    rating_avg   = coalesce((select avg(r.overall) from reviews r
                             join tours tt on tt.id = r.tour_id
                             where tt.creator_id = c.id), 0),
    rating_count = (select count(*) from reviews r
                    join tours tt on tt.id = r.tour_id
                    where tt.creator_id = c.id)
  where c.id = (select creator_id from tours where id = v_tour);

  return null;
end;
$$;

create trigger reviews_aggregate
  after insert or update or delete on reviews
  for each row execute function refresh_tour_ratings();

-- ── Denormalized purchase aggregates (count + creator earnings) ───────
create or replace function refresh_purchase_aggregates()
returns trigger language plpgsql as $$
declare v_tour uuid := coalesce(new.tour_id, old.tour_id);
begin
  update tours t set
    purchase_count = (select count(*) from purchases
                      where tour_id = v_tour and status = 'completed')
  where t.id = v_tour;

  update creator_profiles c set
    total_earnings_cents = coalesce((select sum(creator_amount_cents) from purchases
                                     where creator_id = c.id and status = 'completed'), 0)
  where c.id = coalesce(new.creator_id, old.creator_id);

  return null;
end;
$$;

create trigger purchases_aggregate
  after insert or update or delete on purchases
  for each row execute function refresh_purchase_aggregates();

-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: migrations/0009_rls.sql
-- ═══════════════════════════════════════════════════════════════════════════
-- 0009 — Row-Level Security. Default deny; explicit policies per table.
-- See docs/01-database-schema.md §9. Money/trust writes go through Edge Functions
-- (service role), which bypasses RLS — so several tables intentionally have read-only
-- (or no) client policies.

alter table profiles              enable row level security;
alter table user_preferred_themes enable row level security;
alter table creator_profiles      enable row level security;
alter table cities                enable row level security;
alter table themes                enable row level security;
alter table periods               enable row level security;
alter table tours                 enable row level security;
alter table tour_themes           enable row level security;
alter table stops                 enable row level security;
alter table stop_images           enable row level security;
alter table stop_themes           enable row level security;
alter table stop_periods          enable row level security;
alter table purchases             enable row level security;
alter table payouts               enable row level security;
alter table reviews               enable row level security;
alter table saved_tours           enable row level security;
alter table tour_progress         enable row level security;
alter table tour_downloads        enable row level security;
alter table generated_routes      enable row level security;
alter table generated_route_stops enable row level security;

-- ── Public reference data (read-only to clients) ──────────────────────
create policy "cities public read"  on cities  for select using (true);
create policy "themes public read"  on themes  for select using (true);
create policy "periods public read" on periods for select using (true);

-- ── Profiles ──────────────────────────────────────────────────────────
create policy "own profile rw" on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());
create policy "public reads creator profiles" on profiles
  for select using (is_creator = true);

create policy "own preferred themes" on user_preferred_themes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "creator profiles public read" on creator_profiles
  for select using (true);
create policy "own creator profile write" on creator_profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- ── Tours: published public; creators manage their own ────────────────
create policy "published tours are public" on tours
  for select using (status = 'published');
create policy "creators manage own tours" on tours
  for all using (creator_id = auth.uid()) with check (creator_id = auth.uid());
-- NOTE: the publish transition (draft→in_review→published) is performed only by the
-- tours-publish Edge Function (service role). Add a column guard or BEFORE UPDATE
-- trigger to stop clients self-publishing via the policy above.

create policy "tour themes readable with tour" on tour_themes
  for select using (
    exists (select 1 from tours t where t.id = tour_id
            and (t.status = 'published' or t.creator_id = auth.uid()))
  );
create policy "creators write own tour themes" on tour_themes
  for all using (exists (select 1 from tours t where t.id = tour_id and t.creator_id = auth.uid()))
  with check (exists (select 1 from tours t where t.id = tour_id and t.creator_id = auth.uid()));

-- ── Stops: the content gate ──────────────────────────────────────────
create policy "stop read gate" on stops
  for select using (
    creator_id = auth.uid()        -- owner
    or is_preview = true           -- free taster
    or has_purchased(tour_id)      -- buyer
  );
create policy "creators write own stops" on stops
  for all using (creator_id = auth.uid()) with check (creator_id = auth.uid());

create policy "stop images follow stop" on stop_images
  for select using (
    exists (select 1 from stops s where s.id = stop_id
            and (s.creator_id = auth.uid() or s.is_preview or has_purchased(s.tour_id)))
  );
create policy "creators write own stop images" on stop_images
  for all using (exists (select 1 from stops s where s.id = stop_id and s.creator_id = auth.uid()))
  with check (exists (select 1 from stops s where s.id = stop_id and s.creator_id = auth.uid()));

create policy "stop themes follow stop" on stop_themes
  for select using (
    exists (select 1 from stops s where s.id = stop_id
            and (s.creator_id = auth.uid() or s.is_preview or has_purchased(s.tour_id)))
  );
create policy "stop periods follow stop" on stop_periods
  for select using (
    exists (select 1 from stops s where s.id = stop_id
            and (s.creator_id = auth.uid() or s.is_preview or has_purchased(s.tour_id)))
  );

-- ── Purchases: read own; writes are webhook-only (no write policy) ────
create policy "read own purchases" on purchases
  for select using (user_id = auth.uid());

-- payouts: creator reads own; writes are service-role only
create policy "creator reads own payouts" on payouts
  for select using (creator_id = auth.uid());

-- ── Reviews: public read; purchasers write ───────────────────────────
create policy "reviews are public" on reviews for select using (true);
create policy "purchasers write reviews" on reviews
  for insert with check (user_id = auth.uid() and has_purchased(tour_id));
create policy "edit own review" on reviews
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own review" on reviews
  for delete using (user_id = auth.uid());

-- ── Owner-only personal data ─────────────────────────────────────────
create policy "own saves" on saved_tours
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own progress" on tour_progress
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own downloads" on tour_downloads
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own generated routes" on generated_routes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own generated route stops" on generated_route_stops
  for select using (
    exists (select 1 from generated_routes r where r.id = route_id and r.user_id = auth.uid())
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: migrations/0010_route_candidates.sql
-- ═══════════════════════════════════════════════════════════════════════════
-- 0010 — route_candidates(): the PostGIS candidate-selection step of the layered
-- route engine. Called by the `routes-generate` Edge Function (docs/02-architecture.md §4,
-- step 1). Returns published stops in a city, scored by theme overlap + proximity.
--
-- SECURITY DEFINER so it can be called directly (it bypasses the stops RLS gate). It only
-- ever returns NON-sensitive fields — id, title, coordinates, dwell time — never
-- narration_text or audio_path. That metadata is the discovery "teaser"; paid content
-- stays gated by RLS + signed URLs everywhere else.

create or replace function route_candidates(
  p_city       uuid,
  p_themes     uuid[],
  p_origin_lng double precision,
  p_origin_lat double precision,
  p_limit      integer default 40
)
returns table (
  id             uuid,
  title          text,
  lng            double precision,
  lat            double precision,
  dwell_time_sec integer,
  theme_hits     bigint,
  d              double precision
)
language sql
stable
security definer
set search_path = public
as $$
  with origin as (
    select ST_SetSRID(ST_MakePoint(p_origin_lng, p_origin_lat), 4326)::geography as g
  )
  select
    s.id,
    s.title,
    ST_X(s.location::geometry) as lng,
    ST_Y(s.location::geometry) as lat,
    s.dwell_time_sec,
    count(st.theme_id) as theme_hits,
    ST_Distance(s.location, o.g) as d
  from stops s
  join tours t
    on t.id = s.tour_id
   and t.status = 'published'
   and t.city_id = p_city
  cross join origin o
  -- count only the REQUESTED themes as hits; null/empty p_themes ⇒ no theme filter
  left join stop_themes st
    on st.stop_id = s.id
   and st.theme_id = any(coalesce(p_themes, '{}'::uuid[]))
  where
    p_themes is null
    or array_length(p_themes, 1) is null
    or st.theme_id is not null
  group by s.id, s.title, s.location, s.dwell_time_sec, o.g
  order by theme_hits desc, d asc
  limit greatest(p_limit, 1);
$$;

-- Let the app (authenticated users) and the service role call it.
grant execute on function route_candidates(uuid, uuid[], double precision, double precision, integer)
  to anon, authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: seed.sql
-- ═══════════════════════════════════════════════════════════════════════════
-- Seed data for local dev / first launch city. Applied by `supabase db reset`.

-- Launch city: Limerick (centroid near King John's Castle / city centre).
insert into cities (name, country_code, slug, centroid, timezone, is_active)
values (
  'Limerick', 'IE', 'limerick',
  ST_SetSRID(ST_MakePoint(-8.6267, 52.6638), 4326)::geography,
  'Europe/Dublin', true
)
on conflict (slug) do nothing;

-- The seven lenses (themes).
insert into themes (slug, name, icon, sort_order) values
  ('history',      'History',       '🏛️', 1),
  ('economics',    'Economics',     '📈', 2),
  ('architecture', 'Architecture',  '🏗️', 3),
  ('politics',     'Politics',      '⚖️', 4),
  ('food',         'Food',          '🍽️', 5),
  ('literature',   'Literature',    '📖', 6),
  ('hidden-gems',  'Hidden Gems',   '🔍', 7)
on conflict (slug) do nothing;

-- Historical periods relevant to the Limerick flagship tours (docs/03 §4).
insert into periods (slug, name, year_start, year_end) values
  ('medieval',      'Medieval',          1100, 1500),
  ('georgian',      'Georgian',          1714, 1830),
  ('victorian',     'Victorian',         1837, 1901),
  ('revolutionary', 'Revolutionary Ireland', 1912, 1923),
  ('celtic-tiger',  'Celtic Tiger',      1995, 2008)
on conflict (slug) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- LOCAL DEV DEMO DATA — a demo creator + the three flagship tours + stops.
-- In production these are authored through the creator tooling (docs/03 §4); here
-- they're seeded so the app renders real data end-to-end against the schema + RLS.
-- Safe to re-run: every insert is ON CONFLICT DO NOTHING.
-- ─────────────────────────────────────────────────────────────────────────────

-- Demo creator's auth user. The handle_new_user trigger creates the matching profile.
-- (Local dev only — encrypted_password via pgcrypto; never seed real users this way.)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated',
  'creator@demo.layeredwalks.test',
  crypt('walkme123', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Dr. M. Ó Riain"}',
  false, '', '', '', ''
) on conflict (id) do nothing;

update profiles set is_creator = true where id = '11111111-1111-1111-1111-111111111111';

insert into creator_profiles (id, display_name, bio, status, payout_enabled, revenue_share)
values (
  '11111111-1111-1111-1111-111111111111',
  'Dr. M. Ó Riain',
  'Economic historian. Twenty years researching Limerick''s industrial and urban past.',
  'approved', true, 0.700
) on conflict (id) do nothing;

-- Three published flagship tours (docs/03 §4 / docs/17).
insert into tours (id, creator_id, city_id, title, slug, summary, description,
                   status, difficulty, est_duration_min, distance_meters,
                   price_cents, currency, is_featured, published_at)
values
(
  'a1111111-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  (select id from cities where slug = 'limerick'),
  'Economic Transformation', 'economic-transformation',
  'Shannon-era ambition, FDI, decline and the long recovery.',
  'A walk through the economic forces that built and rebuilt Limerick: the Shannon Scheme, foreign direct investment, deindustrialisation, and the slow, contested recovery of the city centre.',
  'published', 'moderate', 75, 2400, 900, 'EUR', true, now()
),
(
  'a1111111-0000-0000-0000-000000000002',
  '11111111-1111-1111-1111-111111111111',
  (select id from cities where slug = 'limerick'),
  'The Georgian City', 'the-georgian-city',
  'Merchant wealth, terraces and the grid that made modern Limerick.',
  'Newtown Pery and the Georgian plan: how merchant capital laid out a rational grid of brick terraces, and what the facades still tell us about status, trade and decline.',
  'published', 'easy', 60, 1800, 700, 'EUR', true, now()
),
(
  'a1111111-0000-0000-0000-000000000003',
  '11111111-1111-1111-1111-111111111111',
  (select id from cities where slug = 'limerick'),
  'Hidden Limerick', 'hidden-limerick',
  'Forgotten lanes, local stories and curiosities off the trail.',
  'The city the tour buses miss: back lanes, vanished industries, and the small monuments that locals walk past every day without a second glance.',
  'published', 'easy', 45, 1500, 500, 'EUR', false, now()
)
on conflict (id) do nothing;

-- Tour-level lens tags (drives the Discover lens filter).
insert into tour_themes (tour_id, theme_id) values
('a1111111-0000-0000-0000-000000000001', (select id from themes where slug = 'economics')),
('a1111111-0000-0000-0000-000000000001', (select id from themes where slug = 'history')),
('a1111111-0000-0000-0000-000000000002', (select id from themes where slug = 'architecture')),
('a1111111-0000-0000-0000-000000000002', (select id from themes where slug = 'history')),
('a1111111-0000-0000-0000-000000000003', (select id from themes where slug = 'hidden-gems'))
on conflict do nothing;

-- Stops for the Economic Transformation tour (stop 1 is a free preview).
insert into stops (id, tour_id, creator_id, sequence, title, description, narration_text,
                   location, address, dwell_time_sec, is_preview)
values
('b1111111-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000001',
 '11111111-1111-1111-1111-111111111111', 1, 'Bank Place',
 'Where Limerick''s commercial money concentrated.',
 'Stand at Bank Place and look at the doorways. These were built to signal creditworthiness...',
 ST_SetSRID(ST_MakePoint(-8.6267, 52.6638), 4326)::geography, 'Bank Place, Limerick', 180, true),
('b1111111-0000-0000-0000-000000000002', 'a1111111-0000-0000-0000-000000000001',
 '11111111-1111-1111-1111-111111111111', 2, 'The Custom House',
 'Trade, tariffs and the river economy.',
 'The river made Limerick, and the Custom House taxed what the river carried...',
 ST_SetSRID(ST_MakePoint(-8.6285, 52.6655), 4326)::geography, 'Bishop''s Quay, Limerick', 150, false),
('b1111111-0000-0000-0000-000000000003', 'a1111111-0000-0000-0000-000000000001',
 '11111111-1111-1111-1111-111111111111', 3, 'Cruise''s Street',
 'Retail, clearance and the reinvented high street.',
 'What stood here before this was cleared tells the story of post-industrial reinvention...',
 ST_SetSRID(ST_MakePoint(-8.6255, 52.6620), 4326)::geography, 'Cruise''s Street, Limerick', 150, false),
('b1111111-0000-0000-0000-000000000004', 'a1111111-0000-0000-0000-000000000001',
 '11111111-1111-1111-1111-111111111111', 4, 'People''s Park',
 'Civic ambition and Victorian philanthropy.',
 'A park given to the people says something about who held power and how they wished to be seen...',
 ST_SetSRID(ST_MakePoint(-8.6230, 52.6585), 4326)::geography, 'People''s Park, Limerick', 120, false)
on conflict (id) do nothing;

-- Stop-level lens tags (feeds the route engine's theme scoring).
insert into stop_themes (stop_id, theme_id) values
('b1111111-0000-0000-0000-000000000001', (select id from themes where slug = 'economics')),
('b1111111-0000-0000-0000-000000000002', (select id from themes where slug = 'economics')),
('b1111111-0000-0000-0000-000000000002', (select id from themes where slug = 'history')),
('b1111111-0000-0000-0000-000000000003', (select id from themes where slug = 'economics')),
('b1111111-0000-0000-0000-000000000004', (select id from themes where slug = 'history'))
on conflict do nothing;

