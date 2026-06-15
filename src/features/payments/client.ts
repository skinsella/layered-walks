import { supabase } from '@/lib/supabase';

export type CheckoutIntent = {
  paymentIntentClientSecret: string;
  ephemeralKey: string;
  customerId: string;
  publishableKey: string;
  amountCents: number;
  currency: string;
};

/**
 * Calls the `checkout` Edge Function to create a Stripe PaymentIntent for a tour.
 * The function validates the tour is published and not already owned, and computes
 * the platform/creator split. Confirm the intent with @stripe/stripe-react-native.
 * Content is granted by the `stripe-webhook` function, NOT by the confirm callback.
 * See docs/02-architecture.md §7.
 */
export async function createCheckoutIntent(tourId: string): Promise<CheckoutIntent> {
  const { data, error } = await supabase.functions.invoke<CheckoutIntent>(
    'checkout',
    { body: { tour_id: tourId } },
  );
  if (error) throw error;
  if (!data) throw new Error('checkout returned no data');
  return data;
}
