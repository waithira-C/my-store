"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "../db";
import { order, orderItem } from "../db/schema";
import { getCartWithItems } from "../lib/cart";
import { SHIPPING_CENTS } from "../lib/money";
import { getCurrentUser } from "../lib/session";
import { baseUrl, getStripe } from "../lib/stripe";
import { checkoutSchema, parseFormData } from "../lib/validation";
import type { FieldErrors } from "../lib/validation";

export type CheckoutState = {
  error: string | null;
  fieldErrors?: FieldErrors;
};

export async function createCheckoutSessionAction(
  _prevState: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const parsed = parseFormData(checkoutSchema, formData);

  if (!parsed.success) {
    return { error: null, fieldErrors: parsed.fieldErrors };
  }

  const { email, ...address } = parsed.data;

  // Prices and stock are re-read from the database here. Nothing the client
  // submitted contributes to the amount charged.
  const { cart: activeCart, items, currency } = await getCartWithItems();

  if (!activeCart || items.length === 0) {
    return { error: "Your cart is empty." };
  }

  const outOfStock = items.find((item) => item.quantity > item.product.stock);

  if (outOfStock) {
    return {
      error: `${outOfStock.product.name} only has ${outOfStock.product.stock} left in stock.`,
    };
  }

  const subtotalCents = items.reduce(
    (sum, item) => sum + item.product.priceCents * item.quantity,
    0,
  );
  const totalCents = subtotalCents + SHIPPING_CENTS;

  const user = await getCurrentUser();

  const orderId = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(order)
      .values({
        userId: user?.id ?? null,
        cartId: activeCart.id,
        email,
        status: "pending",
        subtotalCents,
        shippingCents: SHIPPING_CENTS,
        totalCents,
        currency,
        shippingAddress: address,
      })
      .returning({ id: order.id });

    await tx.insert(orderItem).values(
      items.map((item) => ({
        orderId: created.id,
        productId: item.product.id,
        // Snapshots: the order must not change if the product later does.
        nameSnapshot: item.product.name,
        unitPriceCents: item.product.priceCents,
        quantity: item.quantity,
      })),
    );

    return created.id;
  });

  let url: string | null;

  try {
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      client_reference_id: orderId,
      // The webhook reads this to find the order it must mark paid.
      metadata: { orderId },
      line_items: items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: item.product.currency,
          unit_amount: item.product.priceCents,
          product_data: { name: item.product.name },
        },
      })),
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: "Standard shipping",
            fixed_amount: { amount: SHIPPING_CENTS, currency },
          },
        },
      ],
      success_url: `${baseUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl()}/checkout/cancel`,
    });

    await db
      .update(order)
      .set({ stripeCheckoutSessionId: session.id })
      .where(eq(order.id, orderId));

    url = session.url;
  } catch (error) {
    // Leave the order as `pending`; it is an abandoned attempt, not a sale.
    console.error("Stripe checkout session failed", error);

    return {
      error:
        error instanceof Error && error.message.includes("STRIPE_SECRET_KEY")
          ? error.message
          : "We couldn't start checkout. Please try again.",
    };
  }

  if (!url) {
    return { error: "We couldn't start checkout. Please try again." };
  }

  // Must be outside the try/catch: redirect() signals by throwing.
  redirect(url);
}
