import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/app/db";
import { order, orderItem } from "@/app/db/schema";
import { formatMoney } from "@/app/lib/money";

export const metadata = { title: "Order confirmed | My Store" };

export default async function CheckoutSuccessPage({
  searchParams,
}: PageProps<"/checkout/success">) {
  const { session_id: sessionId } = await searchParams;

  if (typeof sessionId !== "string") {
    return (
      <div className="flex flex-col items-start gap-3">
        <h1 className="text-2xl font-semibold">Thanks for your order</h1>
        <Link href="/products" className="hover:underline">
          Keep shopping &rarr;
        </Link>
      </div>
    );
  }

  const [placed] = await db
    .select()
    .from(order)
    .where(eq(order.stripeCheckoutSessionId, sessionId))
    .limit(1);

  if (!placed) {
    return (
      <div className="flex flex-col items-start gap-3">
        <h1 className="text-2xl font-semibold">Thanks for your order</h1>
        <p className="text-ink-muted">
          We&apos;re still confirming your payment. This page will show the
          details once Stripe confirms it.
        </p>
      </div>
    );
  }

  const lines = await db
    .select()
    .from(orderItem)
    .where(eq(orderItem.orderId, placed.id));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Thanks for your order</h1>

      {/* The webhook, not this page, marks an order paid -- so it may still be
          pending for a moment after the redirect lands. */}
      {placed.status === "pending" ? (
        <p className="rounded-field bg-warn-soft p-3 text-sm text-warn">
          Payment is still being confirmed. Refresh in a moment.
        </p>
      ) : (
        <p className="text-ink-muted">
          Order confirmed. A receipt is on its way to {placed.email}.
        </p>
      )}

      <ul className="divide-y divide-rule border-y border-rule">
        {lines.map((line) => (
          <li key={line.id} className="flex justify-between py-3 text-sm">
            <span>
              {line.nameSnapshot} &times; {line.quantity}
            </span>
            <span className="tabular-nums">
              {formatMoney(
                line.unitPriceCents * line.quantity,
                placed.currency,
              )}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex justify-between font-semibold">
        <span>Total</span>
        <span className="tabular-nums">
          {formatMoney(placed.totalCents, placed.currency)}
        </span>
      </div>

      <Link href="/account/orders" className="hover:underline">
        View your orders &rarr;
      </Link>
    </div>
  );
}
