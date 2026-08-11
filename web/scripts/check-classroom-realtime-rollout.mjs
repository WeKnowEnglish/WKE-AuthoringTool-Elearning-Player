import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const PUBLIC_READ_FLAGS = [
  "NEXT_PUBLIC_CLASSROOM_REALTIME_ANNOUNCEMENT_PILOT",
  "NEXT_PUBLIC_CLASSROOM_REALTIME_LEARN_PENS_PILOT",
  "NEXT_PUBLIC_CLASSROOM_REALTIME_LEARN_NAVIGATION_PILOT",
  "NEXT_PUBLIC_CLASSROOM_REALTIME_PRESENCE_ROSTER_PILOT",
  "NEXT_PUBLIC_CLASSROOM_REALTIME_PARTICIPANT_REGISTRY_PILOT",
  "NEXT_PUBLIC_CLASSROOM_REALTIME_TIMER_PILOT",
  "NEXT_PUBLIC_CLASSROOM_REALTIME_RANDOMISER_PILOT",
  "NEXT_PUBLIC_CLASSROOM_REALTIME_POINTS_PILOT",
  "NEXT_PUBLIC_CLASSROOM_REALTIME_PICKER_GROUPS_PILOT",
  "NEXT_PUBLIC_CLASSROOM_REALTIME_STATUS_PILOT",
  "NEXT_PUBLIC_CLASSROOM_REALTIME_LIFECYCLE_PILOT",
];

const SERVER_AUTHORITY_FLAGS = [
  "CLASSROOM_REALTIME_SUPABASE_AUTHORITY_PILOT",
  "CLASSROOM_REALTIME_SUPABASE_TOOL_AUTHORITY_PILOT",
  "CLASSROOM_REALTIME_SUPABASE_LIFECYCLE_AUTHORITY_PILOT",
];

const REQUIRED_MIGRATIONS = [
  "127_class_session_runtime_snapshots.sql",
  "128_classroom_realtime_authorization.sql",
  "129_class_session_runtime_snapshot_advance.sql",
  "130_class_session_lobby_heartbeat.sql",
];

const enabled = (env, key) => env[key] === "true";
const present = (env, key) => Boolean(env[key]?.trim());

export function validateClassroomRealtimeRollout(env, options = {}) {
  const errors = [];
  const shadow = enabled(env, "NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE");
  const nativeShell = enabled(env, "NEXT_PUBLIC_CLASSROOM_REALTIME_NATIVE_SHELL_PILOT");
  const anyDependentFlag = [...PUBLIC_READ_FLAGS, ...SERVER_AUTHORITY_FLAGS].some((key) =>
    enabled(env, key),
  );

  if (anyDependentFlag && !shadow) {
    errors.push("NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE=true is required by every classroom realtime pilot.");
  }

  if (shadow) {
    if (!present(env, "NEXT_PUBLIC_SUPABASE_URL")) errors.push("NEXT_PUBLIC_SUPABASE_URL is required.");
    if (!present(env, "NEXT_PUBLIC_SUPABASE_ANON_KEY")) errors.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is required.");
    if (!present(env, "SUPABASE_URL") && !present(env, "NEXT_PUBLIC_SUPABASE_URL")) {
      errors.push("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is required by the server.");
    }
    if (!present(env, "SUPABASE_SERVICE_ROLE_KEY")) errors.push("SUPABASE_SERVICE_ROLE_KEY is required.");
  }

  if (nativeShell) {
    for (const key of [...PUBLIC_READ_FLAGS, ...SERVER_AUTHORITY_FLAGS]) {
      if (!enabled(env, key)) errors.push(`${key}=true is required by the native classroom shell.`);
    }
    if (!present(env, "LIVEBLOCKS_SECRET_KEY")) {
      errors.push("LIVEBLOCKS_SECRET_KEY is still required for guest classes and the shared whiteboard.");
    }
  }

  const migrationExists = options.migrationExists ?? (() => true);
  if (shadow) {
    for (const migration of REQUIRED_MIGRATIONS) {
      if (!migrationExists(migration)) errors.push(`Missing Supabase migration file: ${migration}`);
    }
  }

  return errors;
}

export function assertClassroomRealtimeRollout(env = process.env) {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const migrationDir = join(scriptDir, "..", "supabase", "migrations");
  const errors = validateClassroomRealtimeRollout(env, {
    migrationExists: (migration) => existsSync(join(migrationDir, migration)),
  });
  if (errors.length) {
    throw new Error(`Classroom realtime rollout is incomplete:\n- ${errors.join("\n- ")}`);
  }
  return true;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const nextEnv = await import("@next/env");
  const loadEnvConfig = nextEnv.loadEnvConfig ?? nextEnv.default?.loadEnvConfig;
  if (loadEnvConfig) loadEnvConfig(join(dirname(fileURLToPath(import.meta.url)), ".."));
  assertClassroomRealtimeRollout();
  console.log("Classroom realtime rollout configuration: OK");
}
