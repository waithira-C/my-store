import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  // reducedMotion keeps the suite off the WebGL path on the auth pages:
  // Desktop Chrome at 1280x720 matches `lg`, and headless SwiftShader is slow
  // and occasionally unavailable. The app honours the preference by rendering
  // the static poster, so this is deterministic rather than a workaround.
  use: { baseURL, trace: "retain-on-failure", reducedMotion: "reduce" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Runs against the local SQLite database, never DATABASE_URL from .env.
    command: `npm run dev -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_URL: "file:sqlite.db",
      // Dummy values: the webhook test signs its own payload locally with
      // Stripe's test helper, so nothing here reaches Stripe's API.
      STRIPE_SECRET_KEY: "sk_test_dummy",
      STRIPE_WEBHOOK_SECRET: "whsec_test_dummy",
    },
  },
});
