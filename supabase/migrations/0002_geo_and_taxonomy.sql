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
