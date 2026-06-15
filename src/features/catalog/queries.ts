import { supabase } from '@/lib/supabase';
import type { City, Database, Theme, TourCard } from '@/types/database';

/** Active launch cities (Limerick at MVP). */
export async function fetchActiveCities(): Promise<City[]> {
  const { data, error } = await supabase
    .from('cities')
    .select('id, name, country_code, slug, is_active')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function fetchThemes(): Promise<Theme[]> {
  const { data, error } = await supabase
    .from('themes')
    .select('id, slug, name, icon, sort_order')
    .order('sort_order');
  if (error) throw error;
  return data ?? [];
}

/** Published tours in a city, optionally filtered by theme. RLS hides drafts. */
export async function fetchPublishedTours(
  cityId: string,
  themeId?: string,
): Promise<TourCard[]> {
  let query = supabase
    .from('tours')
    .select(
      'id, title, summary, cover_image_url, price_cents, currency, difficulty, est_duration_min, rating_avg, rating_count',
    )
    .eq('city_id', cityId)
    .eq('status', 'published');

  if (themeId) {
    // Inner-join filter on the tour_themes bridge.
    query = supabase
      .from('tours')
      .select(
        'id, title, summary, cover_image_url, price_cents, currency, difficulty, est_duration_min, rating_avg, rating_count, tour_themes!inner(theme_id)',
      )
      .eq('city_id', cityId)
      .eq('status', 'published')
      .eq('tour_themes.theme_id', themeId);
  }

  const { data, error } = await query.order('is_featured', { ascending: false });
  if (error) throw error;
  return (data ?? []) as TourCard[];
}

export type TourDetail = {
  id: string;
  title: string;
  summary: string | null;
  description: string | null;
  cover_image_url: string | null;
  price_cents: number;
  currency: string;
  difficulty: Database['public']['Enums']['difficulty_level'];
  est_duration_min: number | null;
  distance_meters: number | null;
  rating_avg: number;
  rating_count: number;
  creator: { display_name: string; bio: string | null } | null;
  themes: { slug: string; name: string; icon: string | null }[];
};

/** Full tour page: tour + creator credentials + lens tags. Published-only via RLS. */
export async function fetchTour(id: string): Promise<TourDetail> {
  const { data, error } = await supabase
    .from('tours')
    .select(
      'id, title, summary, description, cover_image_url, price_cents, currency, difficulty, est_duration_min, distance_meters, rating_avg, rating_count, creator_profiles(display_name, bio), tour_themes(themes(slug, name, icon))',
    )
    .eq('id', id)
    .single();
  if (error) throw error;
  const row = data as Record<string, unknown> & {
    creator_profiles?: { display_name: string; bio: string | null } | null;
    tour_themes?: { themes: { slug: string; name: string; icon: string | null } | null }[];
  };
  return {
    ...(row as unknown as TourDetail),
    creator: row.creator_profiles ?? null,
    themes: (row.tour_themes ?? []).map((tt) => tt.themes).filter(Boolean) as TourDetail['themes'],
  };
}

export type StopListItem = {
  id: string;
  sequence: number;
  title: string;
  is_preview: boolean;
  dwell_time_sec: number;
};

/**
 * The public itinerary (safe columns only) via the get_tour_stops() RPC (migration 0011).
 * Returns ALL stops of a published tour — titles + preview flag — so the page can show the
 * locked itinerary. Narration/audio stay gated by the stops RLS content-gate.
 */
export async function fetchTourStops(tourId: string): Promise<StopListItem[]> {
  const { data, error } = await supabase.rpc('get_tour_stops', { p_tour_id: tourId });
  if (error) throw error;
  return (data ?? []) as StopListItem[];
}

/**
 * The set of stop ids the CURRENT user may actually open, read straight from the gated
 * `stops` table — so RLS decides: anon/non-buyer gets only preview stops; an owner (creator)
 * or purchaser gets all. This is what makes the content-gate flip *visible* in the UI.
 */
export async function fetchAccessibleStopIds(tourId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from('stops').select('id').eq('tour_id', tourId);
  if (error) throw error;
  return new Set((data ?? []).map((r: { id: string }) => r.id));
}
