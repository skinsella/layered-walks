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
