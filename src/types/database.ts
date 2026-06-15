/**
 * PLACEHOLDER — replace with generated types once the schema is applied:
 *
 *   npx supabase gen types typescript --local > src/types/database.ts
 *   (or `npm run db:types`)
 *
 * Until then this keeps the typed Supabase client compiling. The generated
 * file will mirror the tables defined in supabase/migrations/*.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: {
      get_tour_stops: {
        Args: { p_tour_id: string };
        Returns: {
          id: string;
          sequence: number;
          title: string;
          is_preview: boolean;
          dwell_time_sec: number;
        }[];
      };
    };
    Enums: {
      tour_status: 'draft' | 'in_review' | 'published' | 'archived';
      creator_status: 'pending' | 'approved' | 'suspended';
      difficulty_level: 'easy' | 'moderate' | 'strenuous';
      purchase_status: 'pending' | 'completed' | 'refunded' | 'failed';
      payout_status: 'pending' | 'in_transit' | 'paid' | 'failed';
    };
  };
};

/** Hand-written domain shapes the UI relies on before codegen runs. */
export type Theme = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  sort_order: number;
};

export type City = {
  id: string;
  name: string;
  country_code: string;
  slug: string;
  is_active: boolean;
};

export type TourCard = {
  id: string;
  title: string;
  summary: string | null;
  cover_image_url: string | null;
  price_cents: number;
  currency: string;
  difficulty: Database['public']['Enums']['difficulty_level'];
  est_duration_min: number | null;
  rating_avg: number;
  rating_count: number;
};
