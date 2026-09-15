import assert from "node:assert/strict";
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

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  loadEnv({ path: ".env.local", override: false });
  assertWke006PilotEnv();
  console.log("WKE-006 preview preflight passed; secrets and capacity values were not printed.");
}
