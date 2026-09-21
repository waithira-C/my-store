import { after } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/app/db";
import { cartItem, order, orderItem, product } from "@/app/db/schema";
import { getStripe } from "@/app/lib/stripe";

/**
 * Stripe webhook. This -- not the success page -- is what marks an order paid:
 * the browser may never reach the success URL.
 *
 * App Router route handlers export named HTTP methods. The raw request body is
 * read with `request.text()`; signature verification needs the exact bytes, so
 * it must not be parsed first.
 */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return new Response("Webhook not configured", { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;

  try {
    event = await getStripe().webhooks.constructEventAsync(
      body,
      signature,
      secret,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid payload";
    return new Response(`Webhook signature verification failed: ${message}`, {
      status: 400,
    });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const orderId = session.metadata?.orderId ?? session.client_reference_id;

    if (orderId) {
      await fulfilOrder(orderId, event);
    }
  }

  return new Response("ok", { status: 200 });
}

async function fulfilOrder(orderId: string, event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;

  const [existing] = await db
    .select()
    .from(order)
    .where(eq(order.id, orderId))
    .limit(1);

  if (!existing) return;

  // Idempotency: a redelivered event finds the order already paid and stops.
  if (existing.status !== "pending") return;

  const lines = await db
    .select()
    .from(orderItem)
    .where(eq(orderItem.orderId, orderId));

  await db.transaction(async (tx) => {
    // Conditional decrement: `stock >= quantity` in the WHERE clause means two
    // concurrent checkouts cannot both take the last unit.
    for (const line of lines) {
      if (!line.productId) continue;

      const result = await tx
        .update(product)
        .set({ stock: sql`${product.stock} - ${line.quantity}` })
        .where(
          and(
            eq(product.id, line.productId),
            sql`${product.stock} >= ${line.quantity}`,
          ),
        );

      if (result.rowsAffected === 0) {
        // Payment already succeeded, so the order still stands -- but flag it.
        console.error(
          `Oversold: order ${orderId} line ${line.id} wanted ${line.quantity} of product ${line.productId}`,
        );
      }
    }

    await tx
      .update(order)
      .set({
        status: "paid",
        paidByEventId: event.id,
        paidAt: new Date(),
        stripePaymentIntentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent?.id ?? null),
      })
      .where(and(eq(order.id, orderId), eq(order.status, "pending")));

    if (existing.cartId) {
      await tx.delete(cartItem).where(eq(cartItem.cartId, existing.cartId));
    }
  });

  // Runs after the response is sent, so a slow mailer cannot make Stripe time
  // out and retry the delivery.
  after(async () => {
    console.log(
      `TODO: send order confirmation for ${orderId} to ${existing.email}`,
    );
  });
}
