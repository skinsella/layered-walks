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

/**
 * Calls the `routes-generate` Edge Function (the layered engine).
 * See docs/02-architecture.md §4 for the algorithm.
 */
export async function generateRoute(req: RouteRequest): Promise<GeneratedRoute> {
  const { data, error } = await supabase.functions.invoke<GeneratedRoute>(
    'routes-generate',
    {
      body: {
        city_id: req.cityId,
        theme_ids: req.themeIds,
        max_minutes: req.maxMinutes,
        intensity: req.intensity,
        origin: req.origin,
      },
    },
  );
  if (error) throw error;
  if (!data) throw new Error('routes-generate returned no data');
  return data;
}
