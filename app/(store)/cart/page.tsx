import Link from "next/link";
import { removeFromCartAction, updateQuantityAction } from "@/app/actions/cart";
import { getCartWithItems } from "@/app/lib/cart";
import { formatMoney } from "@/app/lib/money";

export const metadata = { title: "Cart | My Store" };

export default async function CartPage() {
  const { items, subtotalCents, currency } = await getCartWithItems();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <h1 className="text-2xl font-semibold">Your cart</h1>
        <p className="text-ink-muted">Your cart is empty.</p>
        <Link href="/products" className="hover:underline">
          Browse products &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Your cart</h1>

      <ul className="divide-y divide-rule border-y border-rule">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-4 py-4">
            <div className="flex-1">
              <Link
                href={`/products/${item.product.slug}`}
                className="font-medium hover:underline"
              >
                {item.product.name}
              </Link>
              <p className="text-sm text-ink-faint">
                {formatMoney(item.product.priceCents, item.product.currency)}{" "}
                each
              </p>
            </div>

            <form
              action={updateQuantityAction}
              className="flex items-center gap-2"
            >
              <input type="hidden" name="itemId" value={item.id} />
              <label htmlFor={`qty-${item.id}`} className="sr-only">
                Quantity
              </label>
              <input
                id={`qty-${item.id}`}
                type="number"
                name="quantity"
                defaultValue={item.quantity}
                min={1}
                max={item.product.stock}
                className="w-16 rounded-field border border-field p-1"
              />
              <button
                type="submit"
                className="cursor-pointer text-sm hover:underline"
              >
                Update
              </button>
            </form>

            <p className="w-20 text-right tabular-nums">
              {formatMoney(
                item.product.priceCents * item.quantity,
                item.product.currency,
              )}
            </p>

            <form action={removeFromCartAction}>
              <input type="hidden" name="itemId" value={item.id} />
              <button
                type="submit"
                className="cursor-pointer text-sm text-danger hover:underline"
              >
                Remove
              </button>
            </form>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between">
        <span className="text-lg">Subtotal</span>
        <span
          data-testid="cart-subtotal"
          className="text-lg font-semibold tabular-nums"
        >
          {formatMoney(subtotalCents, currency)}
        </span>
      </div>

      <div className="flex justify-end">
        <Link
          href="/checkout"
          className="rounded-field bg-ink px-5 py-2.5 text-ink-inverse hover:bg-clay-strong"
        >
          Checkout
        </Link>
      </div>
    </div>
  );
}
