import Link from "next/link";
import { CheckoutForm } from "@/app/components/CheckoutForm";
import { getCartWithItems } from "@/app/lib/cart";
import { formatMoney, SHIPPING_CENTS } from "@/app/lib/money";
import { getCurrentUser } from "@/app/lib/session";
import { isStripeConfigured } from "@/app/lib/stripe";

export const metadata = { title: "Checkout | My Store" };

export default async function CheckoutPage() {
  const [{ items, subtotalCents, currency }, user] = await Promise.all([
    getCartWithItems(),
    getCurrentUser(),
  ]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <h1 className="text-2xl font-semibold">Checkout</h1>
        <p className="text-ink-muted">Your cart is empty.</p>
        <Link href="/products" className="hover:underline">
          Browse products &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10 md:grid-cols-2">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Checkout</h1>
        {!isStripeConfigured() && (
          <p className="rounded-field bg-warn-soft p-3 text-sm text-warn">
            STRIPE_SECRET_KEY is not set, so payment will fail. Add your Stripe
            test key to <code>.env.local</code>.
          </p>
        )}
        <CheckoutForm defaultEmail={user?.email} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Order summary</h2>
        <ul className="divide-y divide-rule border-y border-rule">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between py-3 text-sm">
              <span>
                {item.product.name} &times; {item.quantity}
              </span>
              <span className="tabular-nums">
                {formatMoney(
                  item.product.priceCents * item.quantity,
                  item.product.currency,
                )}
              </span>
            </li>
          ))}
        </ul>
        <dl className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">
              {formatMoney(subtotalCents, currency)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>Shipping</dt>
            <dd className="tabular-nums">
              {formatMoney(SHIPPING_CENTS, currency)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-rule pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd data-testid="checkout-total" className="tabular-nums">
              {formatMoney(subtotalCents + SHIPPING_CENTS, currency)}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
