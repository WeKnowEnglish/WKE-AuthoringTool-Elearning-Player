import assert from "node:assert/strict";
import crypto from "node:crypto";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local", override: false });

assert.equal(
  process.env.WKE_003_RELEASE_CONFIRMATION,
  "advisory-linked-project",
  "Retention verification requires the documented WKE-003 release command.",
);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert(url && serviceKey, "Supabase URL and service-role key are required.");

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const batch = crypto.randomUUID();
const oldId = `wke003-retention-old-${batch}`;
const recentId = `wke003-retention-recent-${batch}`;
const eventIds = [oldId, recentId];
const base = {
  occurred_at: new Date().toISOString(),
  user_id: null,
  role: "unknown",
  session_id: `wke003-${batch}`,
  device_id: "wke003-retention",
  surface: "admin",
  phase: "retention_verification",
  event_name: "synthetic_retention_probe",
  event_kind: "mark",
  metadata: { synthetic: true },
  device_category: "unknown",
};

try {
  const { error: insertError } = await admin.from("platform_usage_events").insert([
    {
      ...base,
      event_id: oldId,
      received_at: new Date(Date.now() - 61 * 24 * 60 * 60 * 1_000).toISOString(),
    },
    { ...base, event_id: recentId, received_at: new Date().toISOString() },
  ]);
  assert.ifError(insertError);

  const { data: deleted, error: pruneError } = await admin.rpc(
    "prune_platform_usage_events",
    { p_now: new Date().toISOString() },
  );
  assert.ifError(pruneError);
  assert(Number(deleted) >= 1, "Retention maintenance did not delete the old probe.");

  const { data: remaining, error: readError } = await admin
    .from("platform_usage_events")
    .select("event_id")
    .in("event_id", eventIds);
  assert.ifError(readError);
  assert.deepEqual(remaining?.map((row) => row.event_id), [recentId]);
  console.log("WKE-003 retention verified: old raw event removed; recent event retained.");
} finally {
  await admin.from("platform_usage_events").delete().in("event_id", eventIds);
}
