// checkout — create a Stripe PaymentIntent for a tour (docs/02-architecture.md §7).
// Validates: tour is published, not already owned. Computes platform/creator split from
// creator_profiles.revenue_share. Uses a destination charge so Stripe transfers the
// creator's share to their connected account automatically.
//
// STATUS: scaffold. Wire the Stripe SDK + customer/ephemeral-key in Sprint 3.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { tour_id } = (await req.json()) as { tour_id: string };

    // Caller identity from the JWT (verify_jwt = true in config.toml).
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

    const { data: tour, error } = await admin
      .from('tours')
      .select('id, status, price_cents, currency, creator_id, creator_profiles(revenue_share, stripe_account_id, payout_enabled)')
      .eq('id', tour_id)
      .single();
    if (error || !tour) return json({ error: 'tour not found' }, 404);
    if (tour.status !== 'published') return json({ error: 'tour not purchasable' }, 400);

    // already owned?
    const { data: existing } = await admin
      .from('purchases')
      .select('id')
      .eq('user_id', userId)
      .eq('tour_id', tour_id)
      .in('status', ['pending', 'completed'])
      .maybeSingle();
    if (existing) return json({ error: 'already owned' }, 409);

    // split
    const creator = (tour as any).creator_profiles;
    const platformFee = Math.round(tour.price_cents * (1 - creator.revenue_share));

    // TODO(sprint 3): with Stripe:
    //   const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
    //   const customer = ...ensure customer for userId
    //   const ephemeralKey = ...
    //   const intent = await stripe.paymentIntents.create({
    //     amount: tour.price_cents, currency: tour.currency.toLowerCase(),
    //     customer: customer.id, application_fee_amount: platformFee,
    //     transfer_data: { destination: creator.stripe_account_id },
    //     metadata: { tour_id, user_id: userId, creator_id: tour.creator_id, platform_fee: platformFee },
    //   });
    //   Also insert a `pending` purchase row keyed by intent.id.

    return json({
      stub: true,
      message: 'Wire Stripe SDK in Sprint 3',
      amountCents: tour.price_cents,
      currency: tour.currency,
      platformFeeCents: platformFee,
      creatorAmountCents: tour.price_cents - platformFee,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 400);
  }
});
