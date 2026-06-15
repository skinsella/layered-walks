import { supabase } from '@/lib/supabase';
import type { City, Theme, TourCard } from '@/types/database';

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
