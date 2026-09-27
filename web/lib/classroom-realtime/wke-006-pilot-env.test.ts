import { describe, expect, it } from "vitest";
// @ts-expect-error Deployment preflight intentionally runs as plain Node ESM.
import {
  assertWke006PreviewReachable,
  validateWke006PilotEnv,
  wke006PreviewHeaders,
} from "../../scripts/check-wke-006-pilot-env.mjs";

const full = {
  WKE_006_PILOT_CONFIRMATION: "preview-reconnect-pilot",
  WKE_006_BASE_URL: "https://goal-6-preview.example.test",
  WKE_006_PILOT_STUDENT_COUNT: "8",
  WKE_006_SUPABASE_CONNECTION_CAPACITY: "20",
  WKE_006_LIVEBLOCKS_CONNECTION_CAPACITY: "20",
  WKE_006_ROLLBACK_OWNER: "pilot owner",
  WKE_001_EXPECTED_SUPABASE_PROJECT_REF: "abcdefghijklmnopqrst",
  NEXT_PUBLIC_SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "public",
  SUPABASE_SERVICE_ROLE_KEY: "service",
  LIVEBLOCKS_SECRET_KEY: "liveblocks",
  NEXT_PUBLIC_APP_DIAGNOSTICS_ENABLED: "true",
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

describe("WKE-006 preview pilot preflight", () => {
  it("accepts a guarded preview with plan capacity and rollback ownership", () => {
    expect(validateWke006PilotEnv(full)).toEqual([]);
  });

  it("refuses the public production hostname", () => {
    expect(validateWke006PilotEnv({ ...full, WKE_006_BASE_URL: "https://weknowenglish.online" }))
      .toContain("The public production site is never an allowed WKE-006 browser target.");
  });

  it("requires connection headroom above the student roster", () => {
    expect(validateWke006PilotEnv({ ...full, WKE_006_SUPABASE_CONNECTION_CAPACITY: "9" }))
      .toContain("Supabase connection capacity must be at least 10 (students + teacher + buffer).");
  });

  it("requires the native shell for the reconnect pilot", () => {
    expect(validateWke006PilotEnv({ ...full, NEXT_PUBLIC_CLASSROOM_REALTIME_NATIVE_SHELL_PILOT: "false" }))
      .toContain("NEXT_PUBLIC_CLASSROOM_REALTIME_NATIVE_SHELL_PILOT=true is required for this pilot gate.");
  });

  it("adds the Vercel automation bypass without exposing it in the URL", () => {
    expect(wke006PreviewHeaders({ VERCEL_AUTOMATION_BYPASS_SECRET: "private-value" }))
      .toEqual({
        "x-vercel-protection-bypass": "private-value",
        "x-vercel-set-bypass-cookie": "true",
      });
  });

  it("accepts Vercel's temporary Netscape cookie jar without exposing its value", () => {
    const jar = [
      "# Netscape HTTP Cookie File",
      "#HttpOnly_.vercel.app\tTRUE\t/\tTRUE\t0\t_vercel_jwt\tprivate-cookie",
    ].join("\n");
    expect(wke006PreviewHeaders(
      { WKE_006_VERCEL_COOKIE_FILE: ".vercel/wke-006-cookie.txt" },
      () => jar,
    )).toEqual({ cookie: "_vercel_jwt=private-cookie" });
  });

  it("fails before fixture creation when Vercel Authentication intercepts Preview", async () => {
    const protectedPreviewFetch = async () => new Response(null, {
      status: 307,
      headers: { location: "https://vercel.com/sso-api?url=preview" },
    });
    await expect(assertWke006PreviewReachable(full, protectedPreviewFetch))
      .rejects.toThrow("WKE_006_VERCEL_COOKIE_FILE");
  });
});
