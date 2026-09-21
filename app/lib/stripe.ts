import Stripe from "stripe";

/**
 * Server-side Stripe client. Lazily constructed so that importing this module
 * (which the checkout page and webhook both do) does not crash the whole app
 * when STRIPE_SECRET_KEY is absent -- only the code paths that actually charge
 * money should fail in that case.
 */
let client: Stripe | null = null;

export function getStripe() {
  if (client) return client;

  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Copy env.example to .env.local and add your Stripe test key.",
    );
  }

  client = new Stripe(key);

  return client;
}

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function baseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
}
