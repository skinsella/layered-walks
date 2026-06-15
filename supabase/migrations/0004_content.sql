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
