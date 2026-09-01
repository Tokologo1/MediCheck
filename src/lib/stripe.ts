/**
 * stripe.ts — Stripe server-side singleton
 * Only import this in server-side code (API routes, server components).
 * The publishable key for client-side is in NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.
 */
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is not set");
}

// Use latest API version supported by this SDK version (Stripe v22)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
