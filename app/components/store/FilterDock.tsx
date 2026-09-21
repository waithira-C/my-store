import Link from "next/link";

const chip = (active: boolean) =>
  [
    "rounded-full px-4 py-2 text-body-sm whitespace-nowrap transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay",
    active
      ? "bg-ink text-ink-inverse"
      : "text-ink-muted hover:bg-ink/5 hover:text-ink",
  ].join(" ");

/**
 * The floating category dock. A SERVER component with zero client JS.
 *
 * Real <Link> navigations rather than client state, for three reasons in order
 * of force: the suite asserts a DOM count of zero for filtered-out products
 * (CSS hiding would fail outright), it asserts the `link` role and a resulting
 * `category=mugs` URL, and real URLs are shareable, crawlable and
 * back-button-correct. `scroll={false}` is what satisfies the concept's
 * "without jumping to the top of the page".
 *
 * It replaces the old pill nav rather than joining it -- two links containing
 * "Mugs" on one page is a Playwright strict-mode violation. It is also not a
 * <form>, because the PDP stock test relies on document.querySelector("form")
 * being the add-to-cart form.
 */
export function FilterDock({
  categories,
  active,
}: {
  categories: { id: string; name: string; slug: string }[];
  active?: string;
}) {
  return (
    <>
      {/* In-flow spacer, so the last lane is never hidden behind the dock. */}
      <div aria-hidden="true" className="h-28" />

      {/* pointer-events-none on the full-width shell so the dead space either
          side of the pill can never intercept a click. This is the single
          thing that keeps Playwright actionability green.

          Note: no transform/filter/backdrop-filter may go on an ancestor of
          this element -- any of them would become the containing block for
          position: fixed and the dock would silently turn into absolute. The
          backdrop-blur belongs on the pill itself, below. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-5">
        <nav
          aria-label="Filter by category"
          className="pointer-events-auto flex max-w-[calc(100vw-2rem)] items-center gap-1 overflow-x-auto rounded-full border border-rule bg-paper/85 p-1 shadow-card backdrop-blur-md"
        >
          <Link
            href="/products"
            scroll={false}
            aria-current={active ? undefined : "page"}
            className={chip(!active)}
          >
            All
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/products?category=${c.slug}`}
              scroll={false}
              aria-current={active === c.slug ? "page" : undefined}
              className={chip(active === c.slug)}
            >
              {c.name}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
