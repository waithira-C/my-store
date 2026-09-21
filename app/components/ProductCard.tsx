import Image from "next/image";
import Link from "next/link";
import { formatMoney } from "@/app/lib/money";

type ProductCardProduct = {
  slug: string;
  name: string;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  stock: number;
};

/**
 * Stays a SERVER component. The horizontal-lane parallax reaches inside it
 * purely through inherited CSS custom properties that a client wrapper
 * publishes above it (see LaneItem), so this file needs no hooks, no event
 * handlers and no "use client".
 *
 * The accessible name must keep matching /Sunrise Mug/ -- and nothing
 * containing a category name may go inside the <Link>, or it becomes a second
 * "Mugs" link on /products and trips Playwright strict mode. The lane spec
 * caption lives in LaneItem, as a sibling, for exactly that reason.
 */
export function ProductCard({
  product,
  variant = "grid",
  priority = false,
}: {
  product: ProductCardProduct;
  variant?: "grid" | "lane";
  priority?: boolean;
}) {
  const lane = variant === "lane";

  const media = product.imageUrl ? (
    // Remote hosts must be listed in next.config.ts images.remotePatterns.
    <Image
      src={product.imageUrl}
      alt={product.name}
      fill
      priority={priority}
      sizes={
        lane
          ? "(min-width: 1024px) 336px, (min-width: 640px) 40vw, 78vw"
          : "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
      }
      className="object-cover transition-transform duration-700 ease-editorial group-hover:scale-[1.04]"
    />
  ) : (
    <div className="flex h-full items-center justify-center text-body-sm text-ink-faint">
      No image
    </div>
  );

  return (
    <Link
      href={`/products/${product.slug}`}
      className={[
        "group flex flex-col gap-2",
        // outline, not ring: a ring is clipped by the media frame's overflow.
        "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-clay",
        lane ? "w-[clamp(15rem,26vw,21rem)]" : "",
      ].join(" ")}
    >
      <div
        className={[
          "relative overflow-hidden rounded-card bg-paper-sunken",
          // A fixed aspect means image load causes no layout shift, which is
          // what keeps the lane's useScroll measurements valid.
          lane ? "aspect-[4/5]" : "aspect-square",
        ].join(" ")}
      >
        {/* The translate layer only exists in lane mode; inset:-10% gives the
            parallax headroom so it never reveals an edge. */}
        {lane ? <div className="lane-media-inner">{media}</div> : media}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-medium">{product.name}</h3>
        <p className="text-body-sm tabular-nums">
          {formatMoney(product.priceCents, product.currency)}
        </p>
      </div>
      {product.stock === 0 && (
        <p className="text-body-sm text-ink-faint">Out of stock</p>
      )}
    </Link>
  );
}
