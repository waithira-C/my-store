import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/app/components/ProductCard";
import { Lane } from "@/app/components/store/Lane";
import { LaneItem } from "@/app/components/store/LaneItem";
import { COLLECTIONS, HERO_SLUG } from "@/app/lib/collections";
import {
  getProductBySlug,
  listCategories,
  listProductsBySlugs,
} from "@/app/lib/products";

/** Staggered depth across a lane is what makes the parallax read as space. */
const depthFor = (index: number) => 1 + (index % 3) * 0.35;

export default async function HomePage() {
  const [hero, categories, collections] = await Promise.all([
    getProductBySlug(HERO_SLUG),
    listCategories(),
    Promise.all(
      COLLECTIONS.map(async (collection) => ({
        ...collection,
        products: await listProductsBySlugs(collection.productSlugs),
      })),
    ),
  ]);

  return (
    <div className="flex flex-col">
      {/* full-bleed escapes main's centred max-w-5xl column exactly;
          -mt-8 cancels its top padding so the statement panel meets the header. */}
      <section className="full-bleed -mt-8 border-b border-rule">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-[1.1fr_1fr] lg:py-24">
          <div className="flex flex-col items-start gap-6">
            <p className="text-meta uppercase text-ink-faint">
              Made in small batches
            </p>
            {/* The one h1 on this page. Decorative type elsewhere is always an
                aria-hidden span, never a heading. */}
            <h1 className="text-display-lg text-ink">
              Small things, made well.
            </h1>
            <p className="max-w-[38ch] text-body-lg text-ink-muted">
              Mugs, prints and stationery for slower mornings.
            </p>
            {/* Named "Everything", not "Products": the header already has a
                link named exactly Products and the suite clicks it by name. */}
            <Link
              href="/products"
              className="inline-flex items-center gap-3 border-b border-ink pb-1 text-body-sm text-ink transition-colors hover:border-clay hover:text-clay"
            >
              Everything in the shop &rarr;
            </Link>
          </div>

          {hero?.imageUrl && (
            <figure className="relative m-0">
              <div className="relative aspect-[4/5] overflow-hidden rounded-card bg-paper-sunken">
                <Image
                  src={hero.imageUrl}
                  alt={hero.name}
                  fill
                  priority
                  sizes="(min-width: 1024px) 42vw, 100vw"
                  className="object-cover"
                />
              </div>
              <figcaption className="absolute bottom-4 left-4 rounded-field bg-paper/90 px-3 py-2 text-meta uppercase text-ink-muted backdrop-blur-sm">
                {hero.name}
              </figcaption>
            </figure>
          )}
        </div>
      </section>

      {collections.map((collection) => (
        <Lane
          key={collection.slug}
          label={collection.name}
          sublabel={collection.blurb}
          wordmark={collection.name}
        >
          {collection.products.map((product, index) => (
            <LaneItem key={product.id} depth={depthFor(index)}>
              <ProductCard product={product} variant="lane" />
            </LaneItem>
          ))}

          {/* Contextual in-line content, as the concept asks for: a quote panel
              dropped into the product stream rather than around it. */}
          <LaneItem depth={0.6}>
            <figure className="m-0 flex aspect-[4/5] w-[clamp(15rem,26vw,21rem)] items-center rounded-card bg-paper-sunken p-8">
              <blockquote className="font-display text-title text-ink">
                {collection.pullQuote}
              </blockquote>
            </figure>
          </LaneItem>
        </Lane>
      ))}

      {/* Horizontal overflow is invisible to crawlers, which read source order,
          and a keyboard user should not have to scroll a lane to find a link.
          Everything above is already server-rendered <a href>; this is the
          flat path through it. */}
      <nav
        aria-label="Catalogue index"
        className="flex flex-col gap-3 border-t border-rule pt-8"
      >
        <h2 className="text-meta uppercase text-ink-faint">
          Browse by category
        </h2>
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-body-sm">
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                href={`/products?category=${c.slug}`}
                className="text-ink-muted underline-offset-4 hover:text-clay hover:underline"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
