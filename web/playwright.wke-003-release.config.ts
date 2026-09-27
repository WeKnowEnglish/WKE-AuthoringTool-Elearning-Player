import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", override: false });

const port = 3103;
const externalBaseURL = process.env.WKE_003_BASE_URL?.trim();
const baseURL = externalBaseURL || `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "wke-003-homework-release.spec.ts",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 300_000,
  expect: { timeout: 30_000 },
  reporter: "list",
  outputDir: "test-results/wke-003-release",
  use: {
    baseURL,
    navigationTimeout: 90_000,
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  webServer: externalBaseURL
    ? undefined
    : {
        command: `npm run dev:webpack -- --hostname 127.0.0.1 --port ${port}`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
        env: {
          NEXT_PUBLIC_STUDENT_SELF_REGISTRATION_ENABLED: "false",
          NEXT_PUBLIC_APP_DIAGNOSTICS: "1",
        },
      },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 5"] } },
  ],
});
