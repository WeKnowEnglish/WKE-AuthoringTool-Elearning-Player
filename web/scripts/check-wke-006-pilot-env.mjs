import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { validateClassroomRealtimeRollout } from "./check-classroom-realtime-rollout.mjs";

const CONFIRMATION = "preview-reconnect-pilot";

function positiveInteger(value) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function validateWke006PilotEnv(env) {
  const errors = [];
  if (env.WKE_006_PILOT_CONFIRMATION !== CONFIRMATION) {
    errors.push("Run WKE-006 through its documented pilot command.");
  }

  const baseUrl = env.WKE_006_BASE_URL?.trim();
  if (!baseUrl) {
    errors.push("WKE_006_BASE_URL is required and must point to Preview.");
  } else {
    try {
      const parsed = new URL(baseUrl);
      const hostname = parsed.hostname.toLowerCase();
      if (hostname === "weknowenglish.online" || hostname === "www.weknowenglish.online") {
        errors.push("The public production site is never an allowed WKE-006 browser target.");
      }
      if (parsed.protocol !== "https:") errors.push("WKE_006_BASE_URL must use HTTPS.");
    } catch {
      errors.push("WKE_006_BASE_URL is not a valid URL.");
    }
  }

  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL;
  const publicKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url) errors.push("The Supabase URL is required.");
  if (!publicKey) errors.push("The Supabase public key is required.");
  if (!env.SUPABASE_SERVICE_ROLE_KEY?.trim()) errors.push("The Supabase service-role key is required.");

  const expectedRef = env.WKE_001_EXPECTED_SUPABASE_PROJECT_REF?.trim();
  if (!expectedRef || !/^[a-z0-9]{20}$/.test(expectedRef)) {
    errors.push("WKE_001_EXPECTED_SUPABASE_PROJECT_REF must identify the approved linked project.");
  } else if (url) {
    try {
      const actualRef = new URL(url).hostname.split(".")[0] ?? "";
      if (actualRef !== expectedRef) errors.push("The configured Supabase project does not match the approved project ref.");
    } catch {
      // Invalid URL is already reported above.
    }
  }

  const students = positiveInteger(env.WKE_006_PILOT_STUDENT_COUNT);
  const supabaseCapacity = positiveInteger(env.WKE_006_SUPABASE_CONNECTION_CAPACITY);
  const liveblocksCapacity = positiveInteger(env.WKE_006_LIVEBLOCKS_CONNECTION_CAPACITY);
  if (students === null || students < 2) errors.push("WKE_006_PILOT_STUDENT_COUNT must be at least 2.");
  if (supabaseCapacity === null) errors.push("Record WKE_006_SUPABASE_CONNECTION_CAPACITY from the current plan.");
  if (liveblocksCapacity === null) errors.push("Record WKE_006_LIVEBLOCKS_CONNECTION_CAPACITY from the current plan.");
  if (students !== null) {
    const minimum = students + 2;
    if (supabaseCapacity !== null && supabaseCapacity < minimum) {
      errors.push(`Supabase connection capacity must be at least ${minimum} (students + teacher + buffer).`);
    }
    if (liveblocksCapacity !== null && liveblocksCapacity < minimum) {
      errors.push(`Liveblocks connection capacity must be at least ${minimum} for compatibility rollback.`);
    }
  }
  if (!env.WKE_006_ROLLBACK_OWNER?.trim()) errors.push("WKE_006_ROLLBACK_OWNER is required.");
  if (env.NEXT_PUBLIC_APP_DIAGNOSTICS_ENABLED !== "true") {
    errors.push("NEXT_PUBLIC_APP_DIAGNOSTICS_ENABLED=true is required for recovery evidence.");
  }
  if (env.NEXT_PUBLIC_CLASSROOM_REALTIME_NATIVE_SHELL_PILOT !== "true") {
    errors.push("NEXT_PUBLIC_CLASSROOM_REALTIME_NATIVE_SHELL_PILOT=true is required for this pilot gate.");
  }

  errors.push(...validateClassroomRealtimeRollout(env));
  return [...new Set(errors)];
}

export function assertWke006PilotEnv(env = process.env) {
  const errors = validateWke006PilotEnv(env);
  assert.equal(errors.length, 0, `WKE-006 pilot preflight failed:\n- ${errors.join("\n- ")}`);
}

function netscapeCookieHeader(contents) {
  return contents
    .split(/\r?\n/)
    .filter((line) => line && (!line.startsWith("#") || line.startsWith("#HttpOnly_")))
    .map((line) => line.split("\t"))
    .filter((fields) => fields.length >= 7 && fields[5] && fields[6])
    .map((fields) => `${fields[5]}=${fields[6]}`)
    .join("; ");
}

export function wke006PreviewHeaders(env = process.env, readFile = readFileSync) {
  const secret = env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
  if (secret) {
    return {
      "x-vercel-protection-bypass": secret,
      "x-vercel-set-bypass-cookie": "true",
    };
  }
  const cookieFile = env.WKE_006_VERCEL_COOKIE_FILE?.trim();
  if (!cookieFile) return {};
  const cookie = netscapeCookieHeader(readFile(cookieFile, "utf8"));
  return cookie ? { cookie } : {};
}

export async function assertWke006PreviewReachable(
  env = process.env,
  fetchImpl = globalThis.fetch,
) {
  const baseUrl = env.WKE_006_BASE_URL?.trim();
  if (!baseUrl) return;
  const response = await fetchImpl(new URL("/login?portal=teacher", baseUrl), {
    redirect: "manual",
    headers: wke006PreviewHeaders(env),
  });
  const location = response.headers.get("location");
  if (response.status >= 300 && response.status < 400 && location) {
    const redirect = new URL(location, baseUrl);
    if (redirect.hostname === "vercel.com" || redirect.hostname.endsWith(".vercel.com")) {
      throw new Error(
        "WKE-006 Preview is protected by Vercel Authentication. Configure VERCEL_AUTOMATION_BYPASS_SECRET or WKE_006_VERCEL_COOKIE_FILE in the local operator environment, then rerun the gate.",
      );
    }
  }
  if (response.status >= 500) {
    throw new Error(`WKE-006 Preview reachability check returned HTTP ${response.status}.`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  loadEnv({ path: ".env.local", override: false });
  assertWke006PilotEnv();
  await assertWke006PreviewReachable();
  console.log("WKE-006 preview preflight passed; secrets and capacity values were not printed.");
}
