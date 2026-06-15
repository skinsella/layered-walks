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
