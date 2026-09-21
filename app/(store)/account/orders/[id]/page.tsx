import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/app/db";
import { order, orderItem } from "@/app/db/schema";
import { formatMoney } from "@/app/lib/money";
import { getCurrentUser } from "@/app/lib/session";

export const metadata = { title: "Order | My Store" };

export default async function OrderDetailPage({
  params,
}: PageProps<"/account/orders/[id]">) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) redirect("/signIn");

  const [placed] = await db
    .select()
    .from(order)
    .where(eq(order.id, id))
    .limit(1);

  // Ownership check. Without this, any signed-in user could read any order by
  // guessing its id -- the classic IDOR in a store like this. 404 rather than
  // 403 so the response does not confirm that the order exists.
  if (!placed || placed.userId !== user.id) notFound();

  const lines = await db
    .select()
    .from(orderItem)
    .where(eq(orderItem.orderId, placed.id));

  const address = placed.shippingAddress;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/account/orders" className="text-sm hover:underline">
          &larr; All orders
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">
          Order {placed.createdAt.toLocaleDateString()}
        </h1>
        <p className="text-sm text-ink-faint capitalize">{placed.status}</p>
      </div>

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

      <dl className="flex flex-col gap-1 text-sm">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd className="tabular-nums">
            {formatMoney(placed.subtotalCents, placed.currency)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>Shipping</dt>
          <dd className="tabular-nums">
            {formatMoney(placed.shippingCents, placed.currency)}
          </dd>
        </div>
        <div className="flex justify-between border-t border-rule pt-2 text-base font-semibold">
          <dt>Total</dt>
          <dd className="tabular-nums">
            {formatMoney(placed.totalCents, placed.currency)}
          </dd>
        </div>
      </dl>

      {address && (
        <div className="text-sm text-ink-muted">
          <h2 className="font-medium text-ink">Shipping to</h2>
          <p>{address.line1}</p>
          {address.line2 && <p>{address.line2}</p>}
          <p>
            {address.city} {address.postalCode}
          </p>
          <p>{address.country}</p>
        </div>
      )}
    </div>
  );
}
