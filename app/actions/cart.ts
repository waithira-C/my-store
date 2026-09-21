"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "../db";
import { cartItem, product } from "../db/schema";
import { findCart, findCartItem, getOrCreateCart } from "../lib/cart";
import {
  addToCartSchema,
  parseFormData,
  removeItemSchema,
  updateQuantitySchema,
} from "../lib/validation";

export type CartState = { error: string | null; ok?: boolean };

/**
 * Server Actions are reachable by direct POST, not just through our forms, so
 * every action below re-validates its input and re-checks that the row it is
 * about to touch belongs to the caller's cart.
 */

function revalidateCart() {
  revalidatePath("/cart");
  revalidatePath("/", "layout");
}

export async function addToCartAction(
  _prevState: CartState,
  formData: FormData,
): Promise<CartState> {
  const parsed = parseFormData(addToCartSchema, formData);

  if (!parsed.success) {
    return { error: "That quantity isn't valid." };
  }

  const { productId, quantity } = parsed.data;

  const [item] = await db
    .select()
    .from(product)
    .where(eq(product.id, productId))
    .limit(1);

  if (!item || !item.isActive) {
    return { error: "That product is no longer available." };
  }

  const active = await getOrCreateCart();

  const [existing] = await db
    .select({ quantity: cartItem.quantity })
    .from(cartItem)
    .where(
      sql`${cartItem.cartId} = ${active.id} and ${cartItem.productId} = ${productId}`,
    )
    .limit(1);

  const requested = (existing?.quantity ?? 0) + quantity;

  if (requested > item.stock) {
    return {
      error:
        item.stock === 0
          ? "That product is out of stock."
          : `Only ${item.stock} left in stock.`,
    };
  }

  await db
    .insert(cartItem)
    .values({ cartId: active.id, productId, quantity })
    .onConflictDoUpdate({
      target: [cartItem.cartId, cartItem.productId],
      set: { quantity: requested },
    });

  revalidateCart();

  return { error: null, ok: true };
}

export async function updateQuantityAction(formData: FormData) {
  const parsed = parseFormData(updateQuantitySchema, formData);
  if (!parsed.success) return;

  const active = await findCart();
  if (!active) return;

  // Ownership check: the item must belong to *this* cart.
  const owned = await findCartItem(active.id, parsed.data.itemId);
  if (!owned) return;

  const [stocked] = await db
    .select({ stock: product.stock })
    .from(product)
    .where(eq(product.id, owned.productId))
    .limit(1);

  const quantity = Math.min(parsed.data.quantity, stocked?.stock ?? 0);

  if (quantity < 1) {
    await db.delete(cartItem).where(eq(cartItem.id, owned.id));
  } else {
    await db
      .update(cartItem)
      .set({ quantity })
      .where(eq(cartItem.id, owned.id));
  }

  revalidateCart();
}

export async function removeFromCartAction(formData: FormData) {
  const parsed = parseFormData(removeItemSchema, formData);
  if (!parsed.success) return;

  const active = await findCart();
  if (!active) return;

  const owned = await findCartItem(active.id, parsed.data.itemId);
  if (!owned) return;

  await db.delete(cartItem).where(eq(cartItem.id, owned.id));

  revalidateCart();
}
