import Link from "next/link";

export const metadata = { title: "Checkout cancelled | My Store" };

export default function CheckoutCancelPage() {
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-2xl font-semibold">Checkout cancelled</h1>
      <p className="text-ink-muted">
        No payment was taken and your cart is untouched.
      </p>
      <Link href="/cart" className="hover:underline">
        Back to your cart &rarr;
      </Link>
    </div>
  );
}
