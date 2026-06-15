import { supabase } from '@/lib/supabase';

export type RouteRequest = {
  cityId: string;
  themeIds: string[];
  maxMinutes: number;
  intensity: 'easy' | 'moderate' | 'strenuous';
  origin: { lng: number; lat: number };
};

export type RouteStop = {
  stopId: string;
  sequence: number;
  title: string;
  lng: number;
  lat: number;
  dwellTimeSec: number;
};

export type GeneratedRoute = {
  routeId: string | null;
  stops: RouteStop[];
  totalDurationMin: number;
  totalDistanceM: number;
};

// Walking pace (metres/min) per intensity — see docs/02-architecture.md §4.
const PACE_M_PER_MIN = { easy: 55, moderate: 75, strenuous: 95 } as const;

/**
 * The layered route engine, run CLIENT-SIDE (docs/02-architecture.md §4):
 *  1. candidate selection — the route_candidates() PostGIS RPC (migration 0010), filtered
 *     by city + themes + proximity, runs on the DB.
 *  2. greedy nearest-neighbour ordering within the time budget — pure JS below.
 *
 * MVP uses straight-line (haversine) distance, not Mapbox walking durations — honest
 * heuristic, not a TSP solver. The Edge Function variant (with the secret-token Mapbox
 * Matrix + server persistence) is the later upgrade.
 */
export async function generateRoute(req: RouteRequest): Promise<GeneratedRoute> {
  const { data, error } = await supabase.rpc('route_candidates', {
    p_city: req.cityId,
    p_themes: req.themeIds,
    p_origin_lng: req.origin.lng,
    p_origin_lat: req.origin.lat,
    p_limit: 40,
  });
  if (error) throw error;

  const pool = [...(data ?? [])];
  const pace = PACE_M_PER_MIN[req.intensity];

  const ordered: typeof pool = [];
  let used = 0; // minutes
  let distM = 0;
  let cursor = { lng: req.origin.lng, lat: req.origin.lat };

  while (pool.length > 0) {
    // nearest unused candidate to the current cursor
    pool.sort((a, b) => haversine(cursor, a) - haversine(cursor, b));
    const next = pool.shift()!;
    const legM = haversine(cursor, next);
    const walkMin = legM / pace;
    const dwellMin = next.dwell_time_sec / 60;
    if (ordered.length > 0 && used + walkMin + dwellMin > req.maxMinutes) break;
    used += walkMin + dwellMin;
    distM += legM;
    ordered.push(next);
    cursor = { lng: next.lng, lat: next.lat };
  }

  return {
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
    totalDistanceM: Math.round(distM),
  };
}

/** Straight-line metres between two lng/lat points (placeholder for Mapbox walking distance). */
function haversine(a: { lng: number; lat: number }, b: { lng: number; lat: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
