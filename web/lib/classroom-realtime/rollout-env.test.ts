import { describe, expect, it } from "vitest";
// The deployment guard intentionally runs as plain Node ESM before Next builds.
// @ts-expect-error JavaScript deployment script has no separate declaration file.
import { validateClassroomRealtimeRollout } from "../../scripts/check-classroom-realtime-rollout.mjs";

const full = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "publishable",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role",
  LIVEBLOCKS_SECRET_KEY: "liveblocks",
  NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE: "true",
  NEXT_PUBLIC_CLASSROOM_REALTIME_NATIVE_SHELL_PILOT: "true",
  NEXT_PUBLIC_CLASSROOM_REALTIME_ANNOUNCEMENT_PILOT: "true",
  NEXT_PUBLIC_CLASSROOM_REALTIME_LEARN_PENS_PILOT: "true",
  NEXT_PUBLIC_CLASSROOM_REALTIME_LEARN_NAVIGATION_PILOT: "true",
  NEXT_PUBLIC_CLASSROOM_REALTIME_PRESENCE_ROSTER_PILOT: "true",
  NEXT_PUBLIC_CLASSROOM_REALTIME_PARTICIPANT_REGISTRY_PILOT: "true",
  NEXT_PUBLIC_CLASSROOM_REALTIME_TIMER_PILOT: "true",
  NEXT_PUBLIC_CLASSROOM_REALTIME_RANDOMISER_PILOT: "true",
  NEXT_PUBLIC_CLASSROOM_REALTIME_POINTS_PILOT: "true",
  NEXT_PUBLIC_CLASSROOM_REALTIME_PICKER_GROUPS_PILOT: "true",
  NEXT_PUBLIC_CLASSROOM_REALTIME_STATUS_PILOT: "true",
  NEXT_PUBLIC_CLASSROOM_REALTIME_LIFECYCLE_PILOT: "true",
  CLASSROOM_REALTIME_SUPABASE_AUTHORITY_PILOT: "true",
  CLASSROOM_REALTIME_SUPABASE_TOOL_AUTHORITY_PILOT: "true",
  CLASSROOM_REALTIME_SUPABASE_LIFECYCLE_AUTHORITY_PILOT: "true",
};

describe("classroom realtime rollout environment", () => {
  it("accepts a complete native-shell deployment", () => {
    expect(validateClassroomRealtimeRollout(full)).toEqual([]);
  });

  it("reports a missing server authority lane", () => {
    const errors = validateClassroomRealtimeRollout({
      ...full,
      CLASSROOM_REALTIME_SUPABASE_TOOL_AUTHORITY_PILOT: "false",
    });
    expect(errors).toContain(
      "CLASSROOM_REALTIME_SUPABASE_TOOL_AUTHORITY_PILOT=true is required by the native classroom shell.",
    );
  });

  it("requires the migration slice whenever shadow mode is active", () => {
    const errors = validateClassroomRealtimeRollout(full, {
      migrationExists: (name: string) => !name.startsWith("129_"),
    });
    expect(errors).toContain(
      "Missing Supabase migration file: 129_class_session_runtime_snapshot_advance.sql",
    );
  });

  it("keeps the default all-off deployment valid", () => {
    expect(validateClassroomRealtimeRollout({})).toEqual([]);
  });
});
