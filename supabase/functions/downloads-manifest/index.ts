// downloads-manifest — issue an offline bundle for an OWNED tour (docs §6/§8).
// Re-checks has_purchased(), then returns short-lived signed URLs for every audio file
// and image in the tour, plus the route bbox for Mapbox offline tiles. Writes tour_downloads.
//
// STATUS: scaffold. Wire signed-URL generation + tour_downloads upsert in Sprint 4.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

const SIGNED_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { tour_id } = (await req.json()) as { tour_id: string };

    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
    );
    const { data: userData } = await authClient.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return json({ error: 'unauthenticated' }, 401);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Re-check ownership server-side (defence in depth — never trust the client).
    const { data: owned } = await admin
      .from('purchases')
      .select('id')
      .eq('user_id', userId)
      .eq('tour_id', tour_id)
      .eq('status', 'completed')
      .maybeSingle();
    if (!owned) return json({ error: 'not owned' }, 403);

    // Gather asset keys for the tour's stops.
    const { data: stops } = await admin
      .from('stops')
      .select('id, sequence, audio_path, location, stop_images(storage_path)')
      .eq('tour_id', tour_id)
      .order('sequence');

    // TODO(sprint 4): sign each audio_path + image storage_path from the private bucket:
    //   const { data } = await admin.storage.from('tour-assets')
    //     .createSignedUrl(path, SIGNED_TTL_SECONDS);
    // and compute the bounding box from stop locations for the Mapbox offline region.

    const manifest = {
      tour_id,
      ttl_seconds: SIGNED_TTL_SECONDS,
      stops: stops ?? [],
      // audio: [...signed urls], images: [...signed urls], bbox: [...]
    };

    await admin.from('tour_downloads').upsert(
      {
        user_id: userId,
        tour_id,
        manifest,
        downloaded_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + SIGNED_TTL_SECONDS * 1000).toISOString(),
      },
      { onConflict: 'user_id,tour_id' },
    );

    return json(manifest);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 400);
  }
});
