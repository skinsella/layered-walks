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
