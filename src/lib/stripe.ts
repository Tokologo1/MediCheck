/**
 * stripe.ts — Stripe server-side singleton (lazy initialization)
 *
 * Only import this in server-side code (API routes, server components).
 * The Stripe client is initialized lazily so the build step doesn't fail
 * when STRIPE_SECRET_KEY is not set in the build environment.
 */
import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set");
  }
  _stripe = new Stripe(key);
  return _stripe;
}

// Convenience re-export for callers that prefer `stripe.xxx` syntax
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripeClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
