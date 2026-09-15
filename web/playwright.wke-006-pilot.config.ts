import { defineConfig } from "@playwright/test";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", override: false });

export default defineConfig({
  testDir: "./e2e",
  testMatch: "wke-006-classroom-reconnect.spec.ts",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 300_000,
  expect: { timeout: 30_000 },
  reporter: "list",
  outputDir: "test-results/wke-006-pilot",
  use: {
    baseURL: process.env.WKE_006_BASE_URL,
    navigationTimeout: 90_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [{ name: "classroom-pilot", use: { browserName: "chromium" } }],
});
