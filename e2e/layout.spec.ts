import { expect, test } from "@playwright/test";

/**
 * Structural guards for the editorial redesign.
 *
 * These lock in the invariants the horizontal-canvas layout can silently break
 * without failing shop.spec.ts in an obvious way. Playwright matches an
 * accessible name as a case-insensitive *substring* unless `exact: true`, and
 * any locator resolving to two or more elements throws a strict-mode
 * violation -- so "one more link that happens to say Mugs" is a real
 * regression, not a style nitpick.
 */

test("exactly one link per category on the catalogue", async ({ page }) => {
  await page.goto("/products");

  // The filter dock replaced the old pill nav. Keeping both, linking a lane
  // heading, or labelling the endcap "View all in Mugs" would break the
  // category click in shop.spec.ts.
  for (const name of ["Mugs", "Prints", "Stationery"]) {
    await expect(page.getByRole("link", { name })).toHaveCount(1);
  }
});

test("one h1 per page, and one exact Products link on the home page", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  // Decorative lane wordmarks must stay aria-hidden spans, never headings.
  await expect(
    page.getByRole("link", { name: "Products", exact: true }),
  ).toHaveCount(1);

  await page.goto("/products");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

  await page.goto("/products/sunrise-mug");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
});

test("lanes are keyboard reachable and labelled", async ({ page }) => {
  await page.goto("/products");

  // Chrome does not make overflow containers focusable on its own, so the
  // lanes carry tabIndex + role=region + an accessible name.
  const lanes = page.getByRole("region", { name: "Mugs" });
  await expect(lanes).toHaveCount(1);
  await expect(lanes).toHaveAttribute("tabindex", "0");
});

test("no horizontal document overflow from the full-bleed canvas", async ({
  page,
}) => {
  for (const path of ["/", "/products"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => {
      const el = document.documentElement;
      return el.scrollWidth - el.clientWidth;
    });
    // 100vw + a classic scrollbar is the classic full-bleed bug.
    expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(1);
  }
});

test("the filter dock never covers a product link", async ({ page }) => {
  await page.goto("/products");

  // Playwright actionability fails if a fixed element overlaps the target, so
  // this asserts the real behaviour rather than the CSS.
  await page.getByRole("link", { name: /Brass Pen/ }).click();
  await expect(page).toHaveURL(/\/products\/brass-pen$/);
});
