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
