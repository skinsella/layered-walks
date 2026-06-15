// routes-generate — the layered route engine (docs/02-architecture.md §4).
// Heuristic, NOT a TSP solver: PostGIS candidate selection → greedy nearest-neighbour
// ordering → time-budget fit using Mapbox walking durations.
//
// STATUS: scaffold. The candidate query + budget loop are sketched; the Mapbox Matrix
// call and persistence are TODO for Sprint 5.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

type Body = {
  city_id: string;
  theme_ids: string[];
  max_minutes: number;
  intensity: 'easy' | 'moderate' | 'strenuous';
  origin: { lng: number; lat: number };
};

const PACE_M_PER_MIN = { easy: 55, moderate: 75, strenuous: 95 }; // walking pace

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;

    // Service-role client (RLS bypass) — we apply our own filters.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 1) Candidate stops: published, in city, matching ≥1 theme, near origin.
    //    Implemented as an RPC (define `route_candidates` in a migration) so the
    //    PostGIS scoring lives in SQL. Sketch of the SQL:
    //
    //    select s.id, ST_Y(s.location::geometry) lat, ST_X(s.location::geometry) lng,
    //           s.title, s.dwell_time_sec,
    //           count(st.theme_id) theme_hits,
    //           ST_Distance(s.location, :origin) d
    //    from stops s
    //    join tours t on t.id = s.tour_id and t.status='published' and t.city_id=:city
    //    join stop_themes st on st.stop_id = s.id and st.theme_id = any(:themes)
    //    group by s.id order by theme_hits desc, d asc limit 40;
    const { data: candidates, error } = await supabase.rpc('route_candidates', {
      p_city: body.city_id,
      p_themes: body.theme_ids,
      p_origin_lng: body.origin.lng,
      p_origin_lat: body.origin.lat,
      p_limit: 40,
    });
    if (error) throw error;

    // 2) Greedy nearest-neighbour ordering within the time budget.
    //    TODO(sprint 5): replace straight-line with Mapbox Matrix walking durations,
    //    cache the matrix, apply the backtracking guard (§4 step 4).
    const pace = PACE_M_PER_MIN[body.intensity];
    const ordered: typeof candidates = [];
    let used = 0; // minutes
    let cursor = { lng: body.origin.lng, lat: body.origin.lat };
    const pool = [...(candidates ?? [])];

    while (pool.length > 0) {
      pool.sort((a, b) => haversine(cursor, a) - haversine(cursor, b));
      const next = pool.shift()!;
      const walkMin = haversine(cursor, next) / pace;
      const dwellMin = next.dwell_time_sec / 60;
      if (used + walkMin + dwellMin > body.max_minutes) break;
      used += walkMin + dwellMin;
      ordered.push(next);
      cursor = { lng: next.lng, lat: next.lat };
    }

    // 3) TODO(sprint 5): persist to generated_routes / generated_route_stops for caching.
    return json({
      routeId: null,
      stops: ordered.map((s, i) => ({
        stopId: s.id,
        sequence: i,
        title: s.title,
        lng: s.lng,
        lat: s.lat,
        dwellTimeSec: s.dwell_time_sec,
      })),
      totalDurationMin: Math.round(used),
      totalDistanceM: 0, // TODO: from Mapbox Matrix
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 400);
  }
});

// Straight-line metres between two lng/lat points (placeholder for Mapbox walking distance).
function haversine(a: { lng: number; lat: number }, b: { lng: number; lat: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
