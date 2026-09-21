"use client";

import { useActionState } from "react";
import { addToCartAction, type CartState } from "@/app/actions/cart";

export function AddToCartForm({
  productId,
  maxQuantity,
}: {
  productId: string;
  maxQuantity: number;
}) {
  const [state, formAction, pending] = useActionState<CartState, FormData>(
    addToCartAction,
    { error: null },
  );

  const soldOut = maxQuantity < 1;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="productId" value={productId} />

      <div className="flex items-center gap-3">
        <label htmlFor="quantity" className="text-sm">
          Quantity
        </label>
        <input
          id="quantity"
          type="number"
          name="quantity"
          defaultValue={1}
          min={1}
          max={Math.max(1, maxQuantity)}
          disabled={soldOut}
          className="w-20 rounded-field border border-field p-2"
        />
      </div>

      <button
        type="submit"
        disabled={pending || soldOut}
        className="cursor-pointer rounded-field bg-ink px-4 py-2 text-ink-inverse hover:bg-clay-strong disabled:cursor-not-allowed disabled:opacity-50"
      >
        {soldOut ? "Out of stock" : pending ? "Adding…" : "Add to cart"}
      </button>

      {state.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="text-sm text-success" role="status">
          Added to your cart.
        </p>
      )}
    </form>
  );
}
