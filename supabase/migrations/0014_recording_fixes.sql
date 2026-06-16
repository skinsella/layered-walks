-- 0014 — recording fixes: read a creator's own stops with plain lng/lat, and let
-- creators tag their own stops with lenses.

-- my_stops(): the caller's own stops for a tour, with coordinates as numbers (ST_X/ST_Y)
-- so the recording map can plot them. PostgREST otherwise returns geography as hex WKB.
create or replace function my_stops(p_tour_id uuid)
returns table (
  id       uuid,
  sequence integer,
  title    text,
  lng      double precision,
  lat      double precision
)
language sql
stable
security invoker
set search_path = public
as $$
  select s.id, s.sequence, s.title,
         ST_X(s.location::geometry) as lng,
         ST_Y(s.location::geometry) as lat
  from stops s
  where s.tour_id = p_tour_id and s.creator_id = auth.uid()
  order by s.sequence;
$$;
grant execute on function my_stops(uuid) to authenticated;

-- Creators can add/remove lens tags on their own stops.
create policy "creators tag own stops" on stop_themes for insert to authenticated
  with check (exists (select 1 from stops s where s.id = stop_id and s.creator_id = auth.uid()));
create policy "creators untag own stops" on stop_themes for delete to authenticated
  using (exists (select 1 from stops s where s.id = stop_id and s.creator_id = auth.uid()));
