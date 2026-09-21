import Link from "next/link";
import { ProductCard } from "@/app/components/ProductCard";
import { FilterDock } from "@/app/components/store/FilterDock";
import { Lane } from "@/app/components/store/Lane";
import { LaneItem } from "@/app/components/store/LaneItem";
import {
  listCategories,
  listProducts,
  listProductsGroupedByCategory,
  type ProductLane,
} from "@/app/lib/products";

export const metadata = { title: "Products" };

/** Staggered depth across a lane is what makes the parallax read as space. */
const depthFor = (index: number) => 1 + (index % 3) * 0.35;

export default async function ProductsPage({
  searchParams,
}: PageProps<"/products">) {
  const { category, page } = await searchParams;

  const categorySlug = typeof category === "string" ? category : undefined;
  const pageNumber = Math.max(1, Number(page) || 1);

  // Unfiltered is a browsing surface: one lane per category, every product
  // exactly once (a product appearing twice would make the suite's
  // /Sunrise Mug/ locator ambiguous). Filtered is an enumeration, so it keeps
  // real offset pagination.
  const [categories, grouped, filtered] = await Promise.all([
    listCategories(),
    categorySlug ? Promise.resolve(null) : listProductsGroupedByCategory(),
    categorySlug
      ? listProducts({ categorySlug, page: pageNumber })
      : Promise.resolve(null),
  ]);

  const activeCategory = categories.find((c) => c.slug === categorySlug);

  const lanes: ProductLane[] =
    grouped ??
    (filtered && filtered.products.length > 0
      ? [
          {
            slug: categorySlug ?? "",
            name: activeCategory?.name ?? "Results",
            products: filtered.products,
            total: filtered.total,
          },
        ]
      : []);

  const href = (params: Record<string, string | number | undefined>) => {
    const search = new URLSearchParams();
    if (params.category) search.set("category", String(params.category));
    if (params.page && Number(params.page) > 1)
      search.set("page", String(params.page));
    const query = search.toString();
    return query ? `/products?${query}` : "/products";
  };

  const total = filtered
    ? filtered.total
    : lanes.reduce((sum, lane) => sum + lane.total, 0);
  const pageCount = filtered?.pageCount ?? 0;

  return (
    <div className="flex flex-col">
      <header className="flex flex-col gap-2 pb-2">
        <p className="text-meta uppercase text-ink-faint">The catalogue</p>
        <h1 className="text-heading">Products</h1>
      </header>

      {/* The dock navigates without moving the viewport, so nothing visually
          announces the change. This does, for screen readers. */}
      <p aria-live="polite" className="sr-only">
        {activeCategory
          ? `Showing ${total} in ${activeCategory.name}.`
          : `Showing all ${total} items.`}
      </p>

      {lanes.length === 0 ? (
        <p className="py-10 text-ink-muted">No products found.</p>
      ) : (
        lanes.map((lane) => (
          <Lane
            key={lane.slug}
            label={lane.name}
            wordmark={lane.name}
            sublabel={`${lane.total} ${lane.total === 1 ? "item" : "items"}`}
          >
            {lane.products.map((product, index) => (
              <LaneItem
                key={product.id}
                depth={depthFor(index)}
                spec={`${lane.name} · ${
                  product.stock > 0 ? `${product.stock} in stock` : "Sold out"
                }`}
              >
                <ProductCard product={product} variant="lane" />
              </LaneItem>
            ))}

            {/* Only appears once a category outgrows LANE_LIMIT. The label
                deliberately omits the category name: "View all in Mugs" would
                be a second link containing "Mugs" on this page.
                aria-describedby contributes a description, not a name, so a
                screen reader still gets the lane context. */}
            {lane.total > lane.products.length && (
              <Link
                href={href({ category: lane.slug })}
                scroll={false}
                aria-label={`View all ${lane.total} items`}
                className="flex w-[clamp(11rem,18vw,14rem)] items-center justify-center self-stretch rounded-card border border-dashed border-rule-strong text-body-sm text-ink-muted transition-colors hover:border-ink hover:text-ink"
              >
                View all {lane.total} &rarr;
              </Link>
            )}
          </Lane>
        ))
      )}

      {filtered && pageCount > 1 && (
        <div className="flex items-center justify-between pt-4 text-body-sm">
          {pageNumber > 1 ? (
            <Link
              href={href({ category: categorySlug, page: pageNumber - 1 })}
              className="hover:underline"
            >
              &larr; Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-ink-faint">
            Page {pageNumber} of {pageCount} &middot; {total} items
          </span>
          {pageNumber < pageCount ? (
            <Link
              href={href({ category: categorySlug, page: pageNumber + 1 })}
              className="hover:underline"
            >
              Next &rarr;
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}

      <FilterDock categories={categories} active={categorySlug} />
    </div>
  );
}
