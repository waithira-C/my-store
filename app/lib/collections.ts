/**
 * Curated, editorial groupings for the home canvas.
 *
 * Static config rather than a `collection` table on purpose: it needs no
 * migration, no schema change, no seed coupling, and the copy is editorial and
 * belongs in version control next to the design. A product may appear in more
 * than one collection -- that is what makes the lanes read full with a small
 * catalogue, and the home page has no per-product e2e assertions.
 *
 * Upgrade path if merchandisers ever need deploy-free edits: add `collection`
 * and `collection_product` tables and reimplement a single accessor. The pages
 * depend only on the shape returned here.
 *
 * Note the catalogue view at /products deliberately does NOT use these -- it
 * groups by real category so each product renders exactly once.
 */
export const HERO_SLUG = "sunrise-mug";

export type Collection = {
  slug: string;
  name: string;
  /** Shown as the lane subtitle. */
  blurb: string;
  /** Dropped inline between the cards, as the concept asks for. */
  pullQuote: string;
  productSlugs: string[];
};

export const COLLECTIONS: Collection[] = [
  {
    slug: "morning-essentials",
    name: "Morning Essentials",
    blurb: "The first twenty minutes, unhurried.",
    pullQuote: "Nothing here needs to be rushed.",
    productSlugs: ["sunrise-mug", "long-way-home-mug", "linen-notebook"],
  },
  {
    slug: "the-desk",
    name: "The Desk",
    blurb: "Things worth keeping within reach.",
    pullQuote: "Made to be used, not saved for later.",
    productSlugs: ["brass-pen", "linen-notebook", "field-notes-print-a4"],
  },
  {
    slug: "on-the-wall",
    name: "On the Wall",
    blurb: "Printed slowly, in small runs.",
    pullQuote: "Small editions. Signed, and then finished.",
    productSlugs: ["harbour-print-a3", "field-notes-print-a4"],
  },
];
