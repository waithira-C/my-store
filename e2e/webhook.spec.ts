import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "../app/db";
import { cart, cartItem, order, orderItem, product } from "../app/db/schema";

/**
 * Exercises the Stripe webhook without touching Stripe's API: the payload is
 * signed locally with the same shared secret the route verifies against.
 *
 * This is the part of checkout that actually moves money, so it is tested for
 * the three things that matter: signature verification, the paid transition
 * with stock decrement, and idempotency on redelivery.
 */

const WEBHOOK_SECRET = "whsec_test_dummy";
const stripe = new Stripe("sk_test_dummy");

function signedRequest(event: object) {
  const payload = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: WEBHOOK_SECRET,
  });

  return { payload, signature };
}

function completedEvent(orderId: string, eventId: string) {
  return {
    id: eventId,
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: `cs_test_${eventId}`,
        object: "checkout.session",
        metadata: { orderId },
        payment_intent: `pi_test_${eventId}`,
      },
    },
  };
}

/** Builds a cart and a pending order straight in the database. */
async function seedPendingOrder() {
  // Reset stock to a known value so repeated runs stay deterministic --
  // every pass through this helper decrements it by 2.
  const [seedProduct] = await db
    .update(product)
    .set({ stock: 50 })
    .where(eq(product.slug, "harbour-print-a3"))
    .returning();

  const [createdCart] = await db.insert(cart).values({}).returning();

  await db.insert(cartItem).values({
    cartId: createdCart.id,
    productId: seedProduct.id,
    quantity: 2,
  });

  const [created] = await db
    .insert(order)
    .values({
      email: "webhook@example.com",
      cartId: createdCart.id,
      status: "pending",
      subtotalCents: seedProduct.priceCents * 2,
      shippingCents: 500,
      totalCents: seedProduct.priceCents * 2 + 500,
      currency: seedProduct.currency,
    })
    .returning();

  await db.insert(orderItem).values({
    orderId: created.id,
    productId: seedProduct.id,
    nameSnapshot: seedProduct.name,
    unitPriceCents: seedProduct.priceCents,
    quantity: 2,
  });

  return {
    orderId: created.id,
    cartId: createdCart.id,
    productId: seedProduct.id,
    stockBefore: seedProduct.stock,
  };
}

test("rejects a payload with no signature", async ({ request }) => {
  const response = await request.post("/api/webhooks/stripe", {
    data: completedEvent("does-not-matter", "evt_unsigned"),
  });

  expect(response.status()).toBe(400);
});

test("rejects a payload signed with the wrong secret", async ({ request }) => {
  const event = completedEvent("does-not-matter", "evt_badsig");
  const payload = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: "whsec_not_the_real_secret",
  });

  const response = await request.post("/api/webhooks/stripe", {
    headers: {
      "stripe-signature": signature,
      "content-type": "application/json",
    },
    data: payload,
  });

  expect(response.status()).toBe(400);
  expect(await response.text()).toContain("signature verification failed");
});

test("marks the order paid, decrements stock and clears the cart", async ({
  request,
}) => {
  const seeded = await seedPendingOrder();
  const eventId = `evt_${Date.now()}`;
  const { payload, signature } = signedRequest(
    completedEvent(seeded.orderId, eventId),
  );

  const response = await request.post("/api/webhooks/stripe", {
    headers: {
      "stripe-signature": signature,
      "content-type": "application/json",
    },
    data: payload,
  });

  expect(response.status()).toBe(200);

  const [paid] = await db
    .select()
    .from(order)
    .where(eq(order.id, seeded.orderId))
    .limit(1);

  expect(paid.status).toBe("paid");
  expect(paid.paidByEventId).toBe(eventId);
  expect(paid.stripePaymentIntentId).toBe(`pi_test_${eventId}`);

  const [stocked] = await db
    .select()
    .from(product)
    .where(eq(product.id, seeded.productId))
    .limit(1);

  expect(stocked.stock).toBe(seeded.stockBefore - 2);

  const remaining = await db
    .select()
    .from(cartItem)
    .where(eq(cartItem.cartId, seeded.cartId));

  expect(remaining).toHaveLength(0);
});

test("a redelivered event changes nothing", async ({ request }) => {
  const seeded = await seedPendingOrder();
  const eventId = `evt_dup_${Date.now()}`;
  const { payload, signature } = signedRequest(
    completedEvent(seeded.orderId, eventId),
  );

  const headers = {
    "stripe-signature": signature,
    "content-type": "application/json",
  };

  const first = await request.post("/api/webhooks/stripe", {
    headers,
    data: payload,
  });
  expect(first.status()).toBe(200);

  const [afterFirst] = await db
    .select()
    .from(product)
    .where(eq(product.id, seeded.productId))
    .limit(1);

  // Stripe retries deliveries; the second must not decrement stock again.
  const second = await request.post("/api/webhooks/stripe", {
    headers,
    data: payload,
  });
  expect(second.status()).toBe(200);

  const [afterSecond] = await db
    .select()
    .from(product)
    .where(eq(product.id, seeded.productId))
    .limit(1);

  expect(afterSecond.stock).toBe(afterFirst.stock);
});
