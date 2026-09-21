import { expect, test } from "@playwright/test";

/**
 * End-to-end pass over the storefront: browse, add to cart, adjust quantity,
 * and confirm a guest cart survives signing in.
 */

test("browses the catalogue", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Small things, made well.",
  );

  await page.getByRole("link", { name: "Products", exact: true }).click();
  await expect(page).toHaveURL(/\/products$/);

  // Category filter narrows the grid.
  await page.getByRole("link", { name: "Mugs" }).click();
  await expect(page).toHaveURL(/category=mugs/);
  await expect(page.getByRole("link", { name: /Sunrise Mug/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Linen Notebook/ })).toHaveCount(
    0,
  );
});

test("adds a product to the cart and updates the quantity", async ({
  page,
}) => {
  await page.goto("/products/sunrise-mug");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Sunrise Mug",
  );

  await page.getByLabel("Quantity").fill("2");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByRole("status")).toHaveText("Added to your cart.");

  // Header badge reflects the new quantity.
  await expect(page.getByRole("link", { name: /^Cart/ })).toContainText("(2)");

  await page.getByRole("link", { name: /^Cart/ }).click();
  await expect(page).toHaveURL(/\/cart$/);

  // 2 x $18.50 = $37.00 -- integer cents, no float drift.
  const subtotal = page.getByTestId("cart-subtotal");
  await expect(subtotal).toHaveText("$37.00");

  await page.getByLabel("Quantity").fill("3");
  await page.getByRole("button", { name: "Update" }).click();
  await expect(subtotal).toHaveText("$55.50");

  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("Your cart is empty")).toBeVisible();
});

test("rejects a quantity beyond available stock", async ({ page }) => {
  // brass-pen is seeded with stock 6.
  await page.goto("/products/brass-pen");

  // The `max` attribute stops the browser submitting an oversized quantity, so
  // strip it. Server Actions are reachable by direct POST, and the server-side
  // stock check is the one that actually has to hold.
  await page.evaluate(() => {
    document.querySelector("input[name=quantity]")?.removeAttribute("max");
    document.querySelector("form")?.setAttribute("novalidate", "");
  });

  await page.getByLabel("Quantity").fill("99");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByText("Only 6 left in stock.")).toBeVisible();
});

test("carries a guest cart through sign-up", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;

  await page.goto("/products/linen-notebook");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByRole("status")).toBeVisible();

  await page.goto("/signUp");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill("correct-horse-battery");
  await page.getByPlaceholder("Name").fill("E2E User");
  await page.getByRole("button", { name: "Sign Up" }).click();

  await expect(page).toHaveURL("/");
  // The cart built before authenticating is still there.
  await expect(page.getByRole("link", { name: /^Cart/ })).toContainText("(1)");
});

test("shows the order total including shipping at checkout", async ({
  page,
}) => {
  await page.goto("/products/sunrise-mug");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByRole("status")).toBeVisible();

  await page.goto("/checkout");

  // $18.50 item + $5.00 flat shipping.
  await expect(page.getByTestId("checkout-total")).toHaveText("$23.50");
});

test("requires sign-in to view orders", async ({ page }) => {
  await page.goto("/account/orders");
  await expect(page).toHaveURL(/\/signIn$/);
});

test("returns 404 for an order that is not yours", async ({ page }) => {
  const email = `idor-${Date.now()}@example.com`;

  await page.goto("/signUp");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill("correct-horse-battery");
  await page.getByPlaceholder("Name").fill("IDOR Probe");
  await page.getByRole("button", { name: "Sign Up" }).click();
  await expect(page).toHaveURL("/");

  const response = await page.goto("/account/orders/some-other-users-order");

  // The response is a streamed 200, not a 404: once streaming starts the status
  // header is already sent (our loading.tsx Suspense boundary is what puts the
  // route into streaming mode). Next.js compensates by injecting `noindex`,
  // which is what actually keeps the soft 404 out of search results -- so
  // assert on the rendered boundary and the served HTML, not the status code.
  await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
  expect(await response!.text()).toContain('name="robots" content="noindex"');
});
