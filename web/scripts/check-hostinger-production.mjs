import process from "node:process";

const origin = (process.env.WKE_PRODUCTION_ORIGIN || "https://weknowenglish.online")
  .trim()
  .replace(/\/$/, "");

if (!origin.startsWith("https://")) {
  throw new Error("WKE_PRODUCTION_ORIGIN must use HTTPS.");
}

const failures = [];
const warnings = [];

function pass(message) {
  process.stdout.write("PASS " + message + "\n");
}

function fail(message) {
  failures.push(message);
  process.stderr.write("FAIL " + message + "\n");
}

function warn(message) {
  warnings.push(message);
  process.stdout.write("WARN " + message + "\n");
}

async function request(path, init = {}) {
  try {
    return await fetch(origin + path, {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
      ...init,
    });
  } catch (error) {
    fail(path + " could not be reached: " + (error instanceof Error ? error.message : String(error)));
    return null;
  }
}

async function expectStatus(path, expected, init) {
  const response = await request(path, init);
  if (!response) return null;
  if (!expected.includes(response.status)) {
    fail(path + " returned " + response.status + "; expected " + expected.join(" or "));
    return response;
  }
  pass(path + " returned " + response.status);
  return response;
}

function expectNoStore(path, response) {
  if (!response) return;
  const value = response.headers.get("cache-control") || "";
  if (!value.toLowerCase().includes("no-store")) {
    fail(path + " is missing Cache-Control: no-store");
  } else {
    pass(path + " is protected from proxy caching");
  }
}

const root = await expectStatus("/", [200]);
if (root?.headers.has("x-vercel-id")) {
  fail("Production is still returning a Vercel response identifier.");
} else {
  pass("Production response is not identified as Vercel.");
}
if (!root?.headers.get("strict-transport-security")) {
  warn("Production response does not advertise Strict-Transport-Security.");
}

const healthResponse = await expectStatus("/api/health", [200]);
expectNoStore("/api/health", healthResponse);
if (healthResponse) {
  const health = await healthResponse.json().catch(() => null);
  if (health?.status !== "ok" || health?.environment !== "production") {
    fail("/api/health does not report an OK production application.");
  } else {
    pass("Health payload reports a production application.");
  }
  if (!health?.commit || health.commit === "development") {
    warn("Release metadata is still 'development'; set NEXT_PUBLIC_GIT_COMMIT_SHA at build time.");
  } else {
    pass("Health payload identifies release " + String(health.commit).slice(0, 12) + ".");
  }
}

const runtimeResponse = await expectStatus("/api/runtime-config", [200]);
expectNoStore("/api/runtime-config", runtimeResponse);
if (runtimeResponse) {
  const source = await runtimeResponse.text();
  const match = source.match(/window\.__WKE_RUNTIME_CONFIG__\s*=\s*(\{.*\})\s*;?/s);
  const config = match ? JSON.parse(match[1]) : null;
  let supabaseHost = "";
  try {
    supabaseHost = new URL(config?.supabaseUrl).hostname.toLowerCase();
  } catch {
    // Reported below.
  }
  if (!supabaseHost.endsWith(".supabase.co")) {
    fail("Runtime Supabase URL is missing or invalid.");
  } else {
    pass("Runtime Supabase project is " + supabaseHost.split(".")[0] + ".");
  }
  const anonKey = typeof config?.supabaseAnonKey === "string" ? config.supabaseAnonKey : "";
  if (!(anonKey.startsWith("sb_publishable_") || anonKey.startsWith("eyJ"))) {
    fail("Runtime Supabase anon/publishable key is missing or has invalid capitalization.");
  } else {
    pass("Runtime Supabase key format and capitalization are valid.");
  }
  if (/service.role|service_role|sb_secret_/i.test(source)) {
    fail("Runtime configuration appears to expose a privileged Supabase key.");
  } else {
    pass("Runtime configuration does not expose a privileged Supabase key.");
  }
}

const loginResponse = await expectStatus("/login?portal=teacher", [200]);
expectNoStore("/login?portal=teacher", loginResponse);

for (const [path, locationPrefix] of [
  ["/teacher/classes", "/login"],
  ["/primary", "/primary/login"],
  ["/secondary", "/secondary/login"],
  ["/parent", "/parent/login"],
]) {
  const response = await expectStatus(path, [307, 308]);
  expectNoStore(path, response);
  const location = response?.headers.get("location") || "";
  if (!location.startsWith(locationPrefix)) {
    fail(path + " redirected to an unexpected location: " + (location || "(missing)"));
  } else {
    pass(path + " redirects unauthenticated visitors safely.");
  }
}

for (const path of [
  "/api/cron/diagnostics-retention",
  "/api/cron/daily-cleanup",
  "/api/cron/class-clock",
]) {
  const response = await request(path);
  if (!response) continue;
  if (response.status === 401) {
    pass(path + " is configured and rejects unauthenticated requests.");
  } else if (response.status === 503) {
    fail(path + " reports CRON_SECRET is not configured.");
  } else {
    fail(path + " returned " + response.status + "; expected 401 without credentials.");
  }
}

await expectStatus("/api/webhooks/stripe", [405]);
await expectStatus("/api/webhooks/daily", [405]);

process.stdout.write(
  "\nHostinger production acceptance: " +
    failures.length +
    " failure(s), " +
    warnings.length +
    " warning(s).\n",
);
if (failures.length > 0) process.exitCode = 1;