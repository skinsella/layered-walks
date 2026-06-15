// stripe-webhook — THE source of truth for granting content (docs/02-architecture.md §7).
// verify_jwt = false (Stripe calls it); authenticity is the Stripe signature.
// Must be idempotent on event id. Handles payment_intent.succeeded → purchases.completed,
// charge.refunded → purchases.refunded, account.updated → creator payout_enabled.
//
// STATUS: scaffold. Add real signature verification + Stripe SDK in Sprint 3.

import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const sig = req.headers.get('stripe-signature');
  const raw = await req.text();

  // TODO(sprint 3): verify signature
  //   const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
  //   const event = await stripe.webhooks.constructEventAsync(
  //     raw, sig!, Deno.env.get('STRIPE_WEBHOOK_SECRET')!);
  if (!sig) return new Response('missing signature', { status: 400 });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const event = JSON.parse(raw); // placeholder until signature verification is wired

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        const m = pi.metadata ?? {};
        // Idempotent upsert keyed by stripe_payment_intent_id.
        await admin.from('purchases').upsert(
          {
            stripe_payment_intent_id: pi.id,
            user_id: m.user_id,
            tour_id: m.tour_id,
            creator_id: m.creator_id,
            status: 'completed',
            amount_cents: pi.amount,
            platform_fee_cents: Number(m.platform_fee ?? 0),
            creator_amount_cents: pi.amount - Number(m.platform_fee ?? 0),
            currency: (pi.currency ?? 'eur').toUpperCase(),
            purchased_at: new Date().toISOString(),
          },
          { onConflict: 'stripe_payment_intent_id' },
        );
        break;
      }
      case 'charge.refunded': {
        const ch = event.data.object;
        await admin
          .from('purchases')
          .update({ status: 'refunded' })
          .eq('stripe_payment_intent_id', ch.payment_intent);
        break;
      }
      case 'account.updated': {
        const acct = event.data.object;
        await admin
          .from('creator_profiles')
          .update({ payout_enabled: acct.charges_enabled === true })
          .eq('stripe_account_id', acct.id);
        break;
      }
    }
    return new Response('ok', { status: 200 });
  } catch (e) {
    return new Response(e instanceof Error ? e.message : 'error', { status: 400 });
  }
});
