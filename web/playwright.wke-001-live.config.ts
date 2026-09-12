import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", override: false });

const port = 3101;
const externalBaseURL = process.env.WKE_001_BASE_URL?.trim();
const baseURL = externalBaseURL || `http://127.0.0.1:${port}`;
const projects = [
  {
    name: "desktop-chromium",
    use: { ...devices["Desktop Chrome"] },
  },
  {
    name: "mobile-chromium",
    use: { ...devices["Pixel 5"] },
  },
  ...(process.env.WKE_001_EDGE === "true"
    ? [
        {
          name: "desktop-edge",
          use: { ...devices["Desktop Chrome"], channel: "msedge" as const },
        },
      ]
    : []),
];

export default defineConfig({
  testDir: "./e2e",
  testMatch: "wke-001-live-auth.spec.ts",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 300_000,
  expect: { timeout: 30_000 },
  reporter: "list",
  outputDir: "test-results/wke-001-live",
  use: {
    baseURL,
    navigationTimeout: 90_000,
    permissions: ["microphone"],
    launchOptions: {
      args: [
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
      ],
    },
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
        },
      },
  projects,
});
