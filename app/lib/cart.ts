import { cookies } from "next/headers";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { cart, cartItem, product } from "../db/schema";
import { getCurrentUser } from "./session";

const CART_COOKIE = "cartId";
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

async function cartIdFromCookie() {
  return (await cookies()).get(CART_COOKIE)?.value ?? null;
}

async function setCartCookie(id: string) {
  (await cookies()).set(CART_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: CART_COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
}

/**
 * Resolves the active cart without creating one. Safe to call while rendering.
 * A signed-in user's cart wins over the cookie, so the cart follows the account
 * across devices.
 */
export async function findCart() {
  const user = await getCurrentUser();

  if (user) {
    const [owned] = await db
      .select()
      .from(cart)
      .where(eq(cart.userId, user.id))
      .limit(1);

    if (owned) return owned;
  }

  const id = await cartIdFromCookie();
  if (!id) return null;

  const [guest] = await db.select().from(cart).where(eq(cart.id, id)).limit(1);

  return guest ?? null;
}

/**
 * Resolves the active cart, creating one if needed.
 *
 * Only callable from a Server Action or Route Handler -- it sets a cookie, which
 * Next.js forbids during the render of a Server Component.
 */
export async function getOrCreateCart() {
  const existing = await findCart();
  if (existing) return existing;

  const user = await getCurrentUser();
  const [created] = await db
    .insert(cart)
    .values({ userId: user?.id ?? null })
    .returning();

  await setCartCookie(created.id);

  return created;
}

/**
 * Cart contents with prices re-read from the product table. Line totals are
 * never computed from anything the client sent.
 */
export async function getCartWithItems() {
  const active = await findCart();

  if (!active) {
    return { cart: null, items: [], subtotalCents: 0, currency: "usd" };
  }

  const items = await db
    .select({
      id: cartItem.id,
      quantity: cartItem.quantity,
      product: product,
    })
    .from(cartItem)
    .innerJoin(product, eq(cartItem.productId, product.id))
    .where(eq(cartItem.cartId, active.id));

  const subtotalCents = items.reduce(
    (sum, item) => sum + item.product.priceCents * item.quantity,
    0,
  );

  return {
    cart: active,
    items,
    subtotalCents,
    currency: items[0]?.product.currency ?? "usd",
  };
}

export async function getCartItemCount() {
  const active = await findCart();
  if (!active) return 0;

  const [row] = await db
    .select({ value: sql<number>`coalesce(sum(${cartItem.quantity}), 0)` })
    .from(cartItem)
    .where(eq(cartItem.cartId, active.id));

  return Number(row?.value ?? 0);
}

/**
 * Folds a guest (cookie) cart into the signed-in user's cart. Called from the
 * sign-in and sign-up actions so a cart built before authenticating survives.
 */
export async function mergeGuestCartIntoUserCart(userId: string) {
  const guestCartId = await cartIdFromCookie();
  if (!guestCartId) return;

  const [guest] = await db
    .select()
    .from(cart)
    .where(eq(cart.id, guestCartId))
    .limit(1);

  // Nothing to do if the cookie is stale or already points at the user's cart.
  if (!guest || guest.userId === userId) return;

  const [owned] = await db
    .select()
    .from(cart)
    .where(eq(cart.userId, userId))
    .limit(1);

  if (!owned) {
    // The user has no cart yet -- adopt the guest cart wholesale.
    await db.update(cart).set({ userId }).where(eq(cart.id, guest.id));
    return;
  }

  const guestItems = await db
    .select()
    .from(cartItem)
    .where(eq(cartItem.cartId, guest.id));

  for (const item of guestItems) {
    await db
      .insert(cartItem)
      .values({
        cartId: owned.id,
        productId: item.productId,
        quantity: item.quantity,
      })
      .onConflictDoUpdate({
        target: [cartItem.cartId, cartItem.productId],
        set: { quantity: sql`${cartItem.quantity} + ${item.quantity}` },
      });
  }

  await db.delete(cart).where(eq(cart.id, guest.id));
  await setCartCookie(owned.id);
}

export async function findCartItem(cartId: string, itemId: string) {
  const [row] = await db
    .select()
    .from(cartItem)
    .where(and(eq(cartItem.id, itemId), eq(cartItem.cartId, cartId)))
    .limit(1);

  return row ?? null;
}
