# my-store

A storefront built on Next.js 16 (App Router), Drizzle ORM over libSQL/Turso,
better-auth, Tailwind v4 and Stripe Checkout.

Browse → cart → checkout → order history. Single seller, single currency.

## Getting started

```bash
npm install
cp env.example .env.local   # then fill in the values below
npm run db:migrate          # local SQLite file
npm run db:seed             # a few categories and products to browse
npm run dev
```

Open http://localhost:3000.

### Environment

| Variable                | Needed for | Notes                                             |
| ----------------------- | ---------- | ------------------------------------------------- |
| `BETTER_AUTH_SECRET`    | auth       | Any long random string.                           |
| `BETTER_AUTH_URL`       | auth       | `http://localhost:3000` in dev.                   |
| `DATABASE_URL`          | database   | `file:sqlite.db` locally, `libsql://…` for Turso. |
| `TURSO_AUTH_TOKEN`      | database   | Turso only; ignored for `file:` URLs.             |
| `STRIPE_SECRET_KEY`     | checkout   | Test key (`sk_test_…`).                           |
| `STRIPE_WEBHOOK_SECRET` | checkout   | From `stripe listen`.                             |
| `NEXT_PUBLIC_BASE_URL`  | checkout   | Used to build Stripe return URLs.                 |

**Keep `.env` and `.env.local` apart.** `.env` holds the deployed
(Turso) `DATABASE_URL`; `.env.local` overrides it with `file:sqlite.db` so
`next dev` never reads or writes production. Next.js loads `.env.local` first.

For the same reason `npm run db:migrate` targets the local file and
`npm run db:migrate:remote` is the explicit, opt-in way to migrate Turso.

### Taking a test payment

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# put the printed whsec_… into .env.local, then pay with 4242 4242 4242 4242
```

The **webhook**, not the success page, is what marks an order paid — the browser
may never reach the success URL. It also decrements stock and clears the cart,
keyed on the Stripe event id so a redelivery is a no-op.

## Scripts

| Script                                | What it does                                           |
| ------------------------------------- | ------------------------------------------------------ |
| `npm run dev`                         | Dev server.                                            |
| `npm run build` / `start`             | Production build and serve.                            |
| `npm run typecheck`                   | `tsc --noEmit`.                                        |
| `npm run lint:check` / `format:check` | ESLint and Prettier, as CI runs them.                  |
| `npm run db:generate`                 | Generate a migration from schema changes.              |
| `npm run db:migrate`                  | Apply migrations to the **local** database.            |
| `npm run db:migrate:remote`           | Apply migrations to `DATABASE_URL`.                    |
| `npm run db:seed`                     | Seed categories and products.                          |
| `npm run test:e2e`                    | Playwright suite (starts its own dev server on :3100). |

## Layout

```
app/
  (auth)/          sign in / sign up            → /signIn, /signUp
  (store)/         storefront, cart, checkout, account
  actions/         server actions (auth, cart, checkout)
  api/auth/        better-auth handler
  api/webhooks/    Stripe webhook
  components/      shared UI
  db/              Drizzle schema and client
  lib/             session, cart, products, money, stripe, validation
e2e/               Playwright specs
scripts/           migrate and seed
```

## Notes on this codebase

- **Money is integer cents everywhere.** Format only at the edge, via
  `app/lib/money.ts`. Never a float.
- **Order lines snapshot the product name and price.** Renaming or repricing a
  product must not rewrite history, which is also why `order_item.product_id`
  is `ON DELETE SET NULL`.
- **Prices are always re-read from the database** when building a cart total or
  a Stripe session. Nothing the client submits affects the amount charged.
- **Server Actions are public POST endpoints.** Every cart and order action
  re-validates its input and re-checks row ownership, not just the page that
  renders it.
- **Everything under `(store)` renders dynamically.** The layout reads the
  session and cart cookie, which opts the whole subtree out of static
  rendering. Making product pages static again means moving those reads behind
  `<Suspense>` and turning on `cacheComponents`.
- **Nested `notFound()` returns a streamed 200, not a 404.** Once streaming
  starts the status header is already sent; Next.js injects
  `<meta name="robots" content="noindex">` instead. This is documented
  behaviour, not a bug.

## Not built yet

No admin UI (products come from the seed script), product variants, discount
codes, reviews, search, multi-currency, tax or real shipping rates, or refunds.
