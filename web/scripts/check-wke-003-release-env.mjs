import assert from "node:assert/strict";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", override: false });

if (process.env.WKE_003_RELEASE_CONFIRMATION !== "advisory-linked-project") {
  throw new Error(
    "WKE-003 release gate refused: use the documented test:release:homework command for an explicit advisory linked-project run.",
  );
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const publicKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const expectedProjectRef = process.env.WKE_001_EXPECTED_SUPABASE_PROJECT_REF;

assert(url, "WKE-003 release gate requires the Supabase URL in .env.local.");
assert(publicKey, "WKE-003 release gate requires the public Supabase key in .env.local.");
assert(serviceKey, "WKE-003 release gate requires the service-role key in .env.local.");
assert(
  expectedProjectRef && /^[a-z0-9]{20}$/.test(expectedProjectRef),
  "WKE-003 release gate requires WKE_001_EXPECTED_SUPABASE_PROJECT_REF in .env.local.",
);

let projectRef = "";
try {
  projectRef = new URL(url).hostname.split(".")[0] ?? "";
} catch {
  throw new Error("WKE-003 release gate refused: the configured Supabase URL is invalid.");
}
assert.equal(
  projectRef,
  expectedProjectRef,
  "WKE-003 release gate refused: the configured Supabase project does not match the confirmed project ref.",
);

const externalBaseURL = process.env.WKE_003_BASE_URL?.trim();
if (externalBaseURL) {
  const hostname = new URL(externalBaseURL).hostname.toLowerCase();
  assert(
    hostname !== "weknowenglish.online" && hostname !== "www.weknowenglish.online",
    "WKE-003 release gate refused: the public production site is never an allowed browser target.",
  );
}

console.log("WKE-003 preflight passed; required values are present and were not printed.");
