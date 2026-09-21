import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/app/db";
import { order } from "@/app/db/schema";
import { formatMoney } from "@/app/lib/money";
import { getCurrentUser } from "@/app/lib/session";

export const metadata = { title: "Your orders | My Store" };

export default async function OrdersPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/signIn");

  const orders = await db
    .select()
    .from(order)
    .where(eq(order.userId, user.id))
    .orderBy(desc(order.createdAt));

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <h1 className="text-2xl font-semibold">Your orders</h1>
        <p className="text-ink-muted">You haven&apos;t placed an order yet.</p>
        <Link href="/products" className="hover:underline">
          Browse products &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Your orders</h1>

      <ul className="divide-y divide-rule border-y border-rule">
        {orders.map((placed) => (
          <li
            key={placed.id}
            className="flex items-center justify-between gap-4 py-4"
          >
            <div>
              <Link
                href={`/account/orders/${placed.id}`}
                className="font-medium hover:underline"
              >
                {placed.createdAt.toLocaleDateString()}
              </Link>
              <p className="text-sm text-ink-faint capitalize">
                {placed.status}
              </p>
            </div>
            <p className="tabular-nums">
              {formatMoney(placed.totalCents, placed.currency)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
