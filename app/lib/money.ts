/**
 * Money is stored as an integer number of minor units. Format only at the edge,
 * never round-trip through a float.
 */
export function formatMoney(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

/**
 * Flat shipping rate for the MVP. Lives here rather than in the checkout
 * action: a "use server" module may only export async functions, so exporting a
 * constant from it makes the module appear empty to client components.
 */
export const SHIPPING_CENTS = 500;
