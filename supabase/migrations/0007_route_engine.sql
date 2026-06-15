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
