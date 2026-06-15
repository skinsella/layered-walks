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
