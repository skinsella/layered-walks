import { supabase } from '@/lib/supabase';

/** Web DOM globals accessed defensively (no DOM lib in the RN tsconfig). */
const g = globalThis as unknown as {
  navigator?: {
    geolocation?: {
      getCurrentPosition: (ok: (p: any) => void, err: (e: any) => void, opts?: any) => void;
    };
  };
  crypto?: { randomUUID?: () => string };
};

export type Coords = { lng: number; lat: number; accuracy: number };

export type RecordedStop = {
  id: string;
  sequence: number;
  title: string;
  lng: number;
  lat: number;
};

function uuid(): string {
  return g.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

/** Current GPS position via the browser (foreground). */
export async function captureLocation(): Promise<Coords> {
  const geo = g.navigator?.geolocation;
  if (!geo) throw new Error('Location is not available on this device.');
  return new Promise((resolve, reject) => {
    geo.getCurrentPosition(
      (p) =>
        resolve({
          lng: p.coords.longitude,
          lat: p.coords.latitude,
          accuracy: p.coords.accuracy ?? 0,
        }),
      (e) => reject(new Error(e?.message || 'Could not read your location. Allow location access.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

/** Ensure the signed-in user has a creator profile (created lazily on first record). */
export async function ensureCreatorProfile(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) throw new Error('Please sign in to record a tour.');
  await (supabase as any).from('profiles').update({ is_creator: true }).eq('id', user.id);
  const name = (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'Creator';
  await (supabase as any).from('creator_profiles').upsert({ id: user.id, display_name: name }, { onConflict: 'id' });
  return user.id;
}

/** Find the creator's existing draft tour, or create one. */
export async function getOrCreateDraftTour(creatorId: string, cityId: string): Promise<string> {
  const { data: existing } = await (supabase as any)
    .from('tours')
    .select('id')
    .eq('creator_id', creatorId)
    .eq('status', 'draft')
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data, error } = await (supabase as any)
    .from('tours')
    .insert({
      creator_id: creatorId,
      city_id: cityId,
      title: 'My recorded tour',
      slug: `draft-${uuid().slice(0, 8)}`,
      status: 'draft',
      price_cents: 0,
      currency: 'EUR',
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

/** Upload a recording blob to the media bucket; returns the storage path (key). */
export async function uploadMedia(
  userId: string,
  tourId: string,
  blob: Blob,
  ext: string,
  contentType: string,
): Promise<string> {
  const path = `${userId}/${tourId}/${uuid()}.${ext}`;
  const { error } = await supabase.storage
    .from('tour-media')
    .upload(path, blob, { contentType, upsert: true });
  if (error) throw error;
  return path;
}

/** Save a recorded stop: audio (+ optional photo) uploaded, stop row created via RPC. */
export async function saveRecordedStop(params: {
  userId: string;
  tourId: string;
  sequence: number;
  title: string;
  coords: Coords;
  audio: Blob;
  photo?: Blob | null;
}): Promise<string> {
  const audioPath = await uploadMedia(params.userId, params.tourId, params.audio, 'webm', 'audio/webm');

  const { data: stopId, error } = await supabase.rpc('create_stop', {
    p_tour_id: params.tourId,
    p_sequence: params.sequence,
    p_title: params.title,
    p_lng: params.coords.lng,
    p_lat: params.coords.lat,
    p_accuracy: params.coords.accuracy,
    p_audio_path: audioPath,
    p_dwell: 120,
  });
  if (error) throw error;

  if (params.photo) {
    const photoPath = await uploadMedia(params.userId, params.tourId, params.photo, 'jpg', 'image/jpeg');
    await (supabase as any).from('stop_images').insert({ stop_id: stopId as string, storage_path: photoPath });
  }
  return stopId as string;
}

/** Stops already recorded into the draft tour (for the map + list). */
export async function fetchDraftStops(tourId: string): Promise<RecordedStop[]> {
  const { data, error } = await supabase.rpc('get_tour_stops', { p_tour_id: tourId });
  if (error) throw error;
  // get_tour_stops returns safe columns but not coordinates; pull coords from the owned rows.
  const { data: rows } = await supabase
    .from('stops')
    .select('id, sequence, title, location')
    .eq('tour_id', tourId)
    .order('sequence');
  return ((rows ?? []) as any[]).map((r) => {
    // location comes back as GeoJSON-ish or WKB; fall back gracefully.
    const coords = parseLngLat(r.location);
    return { id: r.id, sequence: r.sequence, title: r.title, lng: coords.lng, lat: coords.lat };
  });
}

/** Best-effort parse of a PostGIS location into {lng,lat}. */
function parseLngLat(loc: unknown): { lng: number; lat: number } {
  if (loc && typeof loc === 'object' && 'coordinates' in (loc as any)) {
    const c = (loc as any).coordinates;
    return { lng: c[0], lat: c[1] };
  }
  return { lng: 0, lat: 0 };
}
