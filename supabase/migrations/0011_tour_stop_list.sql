-- 0011 — get_tour_stops(): the public itinerary for a PUBLISHED tour.
-- Returns only NON-sensitive columns (id, sequence, title, preview flag, dwell time) so the
-- Tour detail page can list the whole itinerary as a sales teaser — while narration_text,
-- audio_path and images stay gated by the `stops` RLS content-gate (migration 0009).
-- SECURITY DEFINER so it can see all of a published tour's stops regardless of purchase;
-- it deliberately never selects the paid columns.

create or replace function get_tour_stops(p_tour_id uuid)
returns table (
  id             uuid,
  sequence       integer,
  title          text,
  is_preview     boolean,
  dwell_time_sec integer
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.sequence, s.title, s.is_preview, s.dwell_time_sec
  from stops s
  join tours t on t.id = s.tour_id and t.status = 'published'
  where s.tour_id = p_tour_id
  order by s.sequence;
$$;

grant execute on function get_tour_stops(uuid) to anon, authenticated, service_role;
