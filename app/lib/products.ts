import { and, asc, count, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { category, product } from "../db/schema";

export const PAGE_SIZE = 12;

/** Cap on how many cards a single horizontal lane renders. */
export const LANE_LIMIT = PAGE_SIZE;

export function listCategories() {
  return db.select().from(category).orderBy(asc(category.name));
}

/**
 * Active products, optionally narrowed to one category slug. Returns the page
 * of rows plus the total count so the caller can render pagination.
 */
export async function listProducts({
  categorySlug,
  page = 1,
}: {
  categorySlug?: string;
  page?: number;
} = {}) {
  const filters = [eq(product.isActive, true)];

  if (categorySlug) {
    const [match] = await db
      .select({ id: category.id })
      .from(category)
      .where(eq(category.slug, categorySlug))
      .limit(1);

    // An unknown category slug must yield no products, not every product.
    if (!match) return { products: [], total: 0, page, pageCount: 0 };

    filters.push(eq(product.categoryId, match.id));
  }

  const where = and(...filters);

  const [rows, [totals]] = await Promise.all([
    db
      .select()
      .from(product)
      .where(where)
      .orderBy(asc(product.name))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ value: count() }).from(product).where(where),
  ]);

  const total = totals?.value ?? 0;

  return {
    products: rows,
    total,
    page,
    pageCount: Math.ceil(total / PAGE_SIZE),
  };
}

export async function getProductBySlug(slug: string) {
  const [row] = await db
    .select()
    .from(product)
    .where(and(eq(product.slug, slug), eq(product.isActive, true)))
    .limit(1);

  return row ?? null;
}

export function listActiveProductSlugs() {
  return db
    .select({ slug: product.slug })
    .from(product)
    .where(eq(product.isActive, true));
}

export function listFeaturedProducts(limit = 4) {
  return db
    .select()
    .from(product)
    .where(eq(product.isActive, true))
    .orderBy(asc(product.name))
    .limit(limit);
}

/**
 * Products for a hand-ordered list of slugs, returned in that exact order.
 *
 * Backs the curated home collections. `listProducts` cannot express "these
 * three, in this order" and caps at PAGE_SIZE. Unknown or inactive slugs in
 * the static config degrade to absent rather than throwing.
 */
export async function listProductsBySlugs(slugs: string[]) {
  if (slugs.length === 0) return [];

  const rows = await db
    .select()
    .from(product)
    .where(and(eq(product.isActive, true), inArray(product.slug, slugs)));

  const bySlug = new Map(rows.map((row) => [row.slug, row]));

  return slugs
    .map((slug) => bySlug.get(slug))
    .filter((row): row is NonNullable<typeof row> => row !== undefined);
}

export type ProductLane = {
  slug: string;
  name: string;
  products: (typeof product.$inferSelect)[];
  /** True count in the category, so a truncated lane can offer a way in. */
  total: number;
};

/**
 * One lane per category, each capped at `perLane`, plus the true per-category
 * total. Single query plus in-memory grouping rather than one query per
 * category, which would be an N+1.
 *
 * Scaling note: this reads every active row. Past a few hundred products,
 * replace with `row_number() over (partition by category_id order by name)`
 * (libSQL supports window functions) and a separate grouped count.
 */
export async function listProductsGroupedByCategory({
  perLane = LANE_LIMIT,
}: { perLane?: number } = {}): Promise<ProductLane[]> {
  const rows = await db
    .select({
      p: product,
      categoryName: category.name,
      categorySlug: category.slug,
    })
    .from(product)
    .leftJoin(category, eq(product.categoryId, category.id))
    .where(eq(product.isActive, true))
    .orderBy(asc(category.name), asc(product.name));

  const lanes = new Map<string, ProductLane>();

  for (const row of rows) {
    const slug = row.categorySlug ?? "uncategorised";
    const lane = lanes.get(slug) ?? {
      slug,
      name: row.categoryName ?? "Everything else",
      products: [],
      total: 0,
    };

    lane.total += 1;
    if (lane.products.length < perLane) lane.products.push(row.p);
    lanes.set(slug, lane);
  }

  return [...lanes.values()];
}
