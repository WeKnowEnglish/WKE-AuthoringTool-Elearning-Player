import { defineConfig } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { readFileSync } from "node:fs";

loadEnv({ path: ".env.local", override: false });

function protectionHeaders(): Record<string, string> {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
  if (secret) {
    return {
      "x-vercel-protection-bypass": secret,
      "x-vercel-set-bypass-cookie": "true",
    };
  }
  const cookieFile = process.env.WKE_006_VERCEL_COOKIE_FILE?.trim();
  if (!cookieFile) return {};
  const cookie = readFileSync(cookieFile, "utf8")
    .split(/\r?\n/)
    .filter((line) => line && (!line.startsWith("#") || line.startsWith("#HttpOnly_")))
    .map((line) => line.split("\t"))
    .filter((fields) => fields.length >= 7 && fields[5] && fields[6])
    .map((fields) => `${fields[5]}=${fields[6]}`)
    .join("; ");
  return cookie ? { cookie } : {};
}

const protectionHeadersValue = protectionHeaders();
const usesProtectionCredential = Object.keys(protectionHeadersValue).length > 0;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "wke-006-classroom-reconnect.spec.ts",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 600_000,
  expect: { timeout: 30_000 },
  reporter: "list",
  outputDir: "test-results/wke-006-pilot",
  use: {
    baseURL: process.env.WKE_006_BASE_URL,
    actionTimeout: 30_000,
    navigationTimeout: 90_000,
    // Vercel's bypass value is an access credential. Do not write it into trace artifacts.
    trace: usesProtectionCredential ? "off" : "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    ...(usesProtectionCredential ? { extraHTTPHeaders: protectionHeadersValue } : {}),
  },
  projects: [{ name: "classroom-pilot", use: { browserName: "chromium" } }],
});
