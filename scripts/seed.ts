/**
 * Seeds the local dev database with categories and products so the storefront
 * has something to render before an admin UI exists.
 *
 * Defaults to the local database for the same reason as scripts/migrate.mjs:
 * `.env` holds the production DATABASE_URL. Pass `--remote` to target it.
 * Re-running is safe -- rows are upserted on their unique `slug`.
 */
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { category, product } from "../app/db/schema.ts";

const LOCAL_URL = "file:sqlite.db";
const remote = process.argv.includes("--remote");
const url = remote ? (process.env.DATABASE_URL ?? LOCAL_URL) : LOCAL_URL;

const client = createClient({
  url,
  authToken: remote ? process.env.TURSO_AUTH_TOKEN : undefined,
});
const db = drizzle(client, { schema: { category, product } });

const CATEGORIES = [
  { slug: "mugs", name: "Mugs" },
  { slug: "prints", name: "Prints" },
  { slug: "stationery", name: "Stationery" },
];

// priceCents: integer minor units. 1850 === $18.50.
const PRODUCTS = [
  {
    slug: "sunrise-mug",
    name: "Sunrise Mug",
    imageUrl: "/images/sunrise-mug.avif",
    description: "Stoneware mug, 350ml, glazed by hand. Dishwasher safe.",
    priceCents: 1850,
    categorySlug: "mugs",
    stock: 24,
  },
  {
    slug: "long-way-home-mug",
    name: "Long Way Home Mug",
    imageUrl: "/images/wide-mug.jpg",
    description: "A wider mug for slower mornings. 420ml, matte finish.",
    priceCents: 2200,
    categorySlug: "mugs",
    stock: 12,
  },
  {
    slug: "harbour-print-a3",
    name: "Harbour Print (A3)",
    imageUrl: "/images/giclee.jpg",
    description: "Giclée print on 250gsm cotton rag. Unframed.",
    priceCents: 3400,
    categorySlug: "prints",
    stock: 8,
  },
  {
    slug: "field-notes-print-a4",
    name: "Field Notes Print (A4)",
    imageUrl: "/images/risograph.jpg",
    description: "Two-colour risograph, signed on the reverse.",
    priceCents: 2600,
    categorySlug: "prints",
    stock: 15,
  },
  {
    slug: "linen-notebook",
    name: "Linen Notebook",
    imageUrl: "/images/linen-notebook.jpg",
    description: "A5, 160 dotted pages, lay-flat binding.",
    priceCents: 1600,
    categorySlug: "stationery",
    stock: 40,
  },
  {
    slug: "brass-pen",
    name: "Brass Pen",
    imageUrl: "/images/brass-pen.jpg",
    description: "Machined brass, refillable. Develops a patina with use.",
    priceCents: 4200,
    categorySlug: "stationery",
    stock: 6,
  },
];

console.log(`Seeding ${remote ? "REMOTE " : "local "}${url}`);

const categoryIds = new Map<string, string>();

for (const row of CATEGORIES) {
  const [inserted] = await db
    .insert(category)
    .values(row)
    .onConflictDoUpdate({ target: category.slug, set: { name: row.name } })
    .returning({ id: category.id, slug: category.slug });

  categoryIds.set(inserted.slug, inserted.id);
}

for (const { categorySlug, ...row } of PRODUCTS) {
  const values = { ...row, categoryId: categoryIds.get(categorySlug) ?? null };

  await db
    .insert(product)
    .values(values)
    .onConflictDoUpdate({ target: product.slug, set: values });
}

console.log(
  `Seeded ${CATEGORIES.length} categories and ${PRODUCTS.length} products.`,
);

client.close();
