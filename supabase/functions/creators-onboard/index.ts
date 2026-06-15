// creators-onboard — create/link a Stripe Connect Express account and return an
// onboarding URL (docs/02-architecture.md §7). payout_enabled is flipped later by the
// account.updated webhook, not here.
//
// STATUS: scaffold. Wire Stripe Connect in Sprint 6 (or earlier to onboard yourself).

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
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

    // Ensure a creator_profiles row exists (and mark profile is_creator).
    await admin.from('profiles').update({ is_creator: true }).eq('id', userId);
    await admin
      .from('creator_profiles')
      .upsert({ id: userId, display_name: 'New creator' }, { onConflict: 'id' });

    // TODO(sprint 6): with Stripe:
    //   const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
    //   const account = await stripe.accounts.create({ type: 'express', country: 'IE' });
    //   await admin.from('creator_profiles')
    //     .update({ stripe_account_id: account.id }).eq('id', userId);
    //   const link = await stripe.accountLinks.create({
    //     account: account.id, type: 'account_onboarding',
    //     refresh_url: 'layeredwalks://creator/onboard/refresh',
    //     return_url:  'layeredwalks://creator/onboard/return',
    //   });
    //   return json({ onboardingUrl: link.url });

    return json({ stub: true, message: 'Wire Stripe Connect in Sprint 6' });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 400);
  }
});
