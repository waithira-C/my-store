import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-2xl font-semibold">Not found</h1>
      <p className="text-ink-muted">
        We couldn&apos;t find what you were looking for.
      </p>
      <Link href="/products" className="hover:underline">
        Browse products &rarr;
      </Link>
    </div>
  );
}
