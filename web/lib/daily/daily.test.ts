import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  computeMeetingTokenExpUnix,
  DAILY_ROOM_TTL_MS,
  DAILY_TOKEN_GRACE_MS,
  DAILY_TOKEN_TTL_MS,
  evaluateSessionJoinability,
} from "@/lib/daily/join-window";
import { opaqueDailyRoomName } from "@/lib/daily/room-name";
import { createPrivateDailyRoom } from "@/lib/daily/rooms";
import {
  buildMeetingTokenProperties,
  callRoleFromVcRole,
} from "@/lib/daily/tokens";
import { isDailyEnabled } from "@/lib/env/daily-server";

describe("opaqueDailyRoomName", () => {
  it("is stable, opaque, and Daily-safe", () => {
    const a = opaqueDailyRoomName("vcs_AB34CD");
    const b = opaqueDailyRoomName("vcs_AB34CD");
    expect(a).toBe(b);
    expect(a).toMatch(/^wke-d-[a-f0-9]{24}$/);
    expect(a).not.toContain("AB34CD");
    expect(opaqueDailyRoomName("vcs_OTHER1")).not.toBe(a);
  });
});

describe("evaluateSessionJoinability", () => {
  const now = Date.parse("2026-07-30T12:00:00.000Z");

  it("allows active sessions with no room expiry", () => {
    expect(evaluateSessionJoinability({ status: "active", nowMs: now })).toEqual({
      ok: true,
    });
  });

  it("rejects ended and non-active sessions", () => {
    expect(evaluateSessionJoinability({ status: "ended", nowMs: now })).toMatchObject({
      ok: false,
      code: "session_ended",
    });
    expect(
      evaluateSessionJoinability({ status: "scheduled", nowMs: now }),
    ).toMatchObject({ ok: false, code: "session_not_active" });
  });

  it("rejects after room expiry + grace", () => {
    const expired = new Date(now - DAILY_TOKEN_GRACE_MS - 1).toISOString();
    expect(
      evaluateSessionJoinability({
        status: "active",
        roomExpiresAt: expired,
        nowMs: now,
      }),
    ).toMatchObject({ ok: false, code: "room_expired" });
  });

  it("allows within grace after room expiry", () => {
    const justExpired = new Date(now - DAILY_TOKEN_GRACE_MS / 2).toISOString();
    expect(
      evaluateSessionJoinability({
        status: "active",
        roomExpiresAt: justExpired,
        nowMs: now,
      }),
    ).toEqual({ ok: true });
  });
});

describe("computeMeetingTokenExpUnix", () => {
  it("caps token ttl and room expiry+grace", () => {
    const now = Date.parse("2026-07-30T12:00:00.000Z");
    const roomExpiresAt = new Date(now + 30 * 60 * 1000).toISOString();
    const exp = computeMeetingTokenExpUnix({ nowMs: now, roomExpiresAt });
    const expectedCap = Math.floor(
      Math.min(now + DAILY_TOKEN_TTL_MS, now + 30 * 60 * 1000 + DAILY_TOKEN_GRACE_MS) /
        1000,
    );
    expect(exp).toBe(expectedCap);
  });
});

describe("meeting token properties", () => {
  it("gives teacher owner + screenshare; students/guests neither", () => {
    const base = {
      roomName: "wke-d-abc",
      userId: "user-1",
      userName: "Sam",
      exp: 1_700_000_000,
    };
    const teacher = buildMeetingTokenProperties({ ...base, role: "teacher" });
    expect(teacher).toMatchObject({
      is_owner: true,
      enable_screenshare: true,
      enable_recording: false,
      start_cloud_recording: false,
    });

    const student = buildMeetingTokenProperties({ ...base, role: "student" });
    expect(student).toMatchObject({
      is_owner: false,
      enable_screenshare: false,
    });

    const guest = buildMeetingTokenProperties({ ...base, role: "guest" });
    expect(guest).toMatchObject({
      is_owner: false,
      enable_screenshare: false,
    });
  });

  it("maps VC roles to Daily call roles", () => {
    expect(callRoleFromVcRole("host", false)).toBe("teacher");
    expect(callRoleFromVcRole("member", true)).toBe("teacher");
    expect(callRoleFromVcRole("member", false)).toBe("student");
  });
});

describe("isDailyEnabled", () => {
  const prevKey = process.env.DAILY_API_KEY;
  const prevEnabled = process.env.DAILY_ENABLED;

  afterEach(() => {
    if (prevKey === undefined) delete process.env.DAILY_API_KEY;
    else process.env.DAILY_API_KEY = prevKey;
    if (prevEnabled === undefined) delete process.env.DAILY_ENABLED;
    else process.env.DAILY_ENABLED = prevEnabled;
  });

  it("respects explicit off and key presence", () => {
    process.env.DAILY_API_KEY = "daily_test_key";
    delete process.env.DAILY_ENABLED;
    expect(isDailyEnabled()).toBe(true);

    process.env.DAILY_ENABLED = "false";
    expect(isDailyEnabled()).toBe(false);

    process.env.DAILY_ENABLED = "true";
    delete process.env.DAILY_API_KEY;
    expect(isDailyEnabled()).toBe(false);
  });
});

describe("createPrivateDailyRoom", () => {
  beforeEach(() => {
    process.env.DAILY_API_KEY = "daily_test_key";
  });

  afterEach(() => {
    delete process.env.DAILY_API_KEY;
  });

  it("creates a private room with cloud recording allowed (no auto-start)", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        name: "wke-d-test",
        url: "https://example.daily.co/wke-d-test",
        created_at: "2026-07-30T12:00:00.000Z",
      }),
    );

    const room = await createPrivateDailyRoom({
      sessionId: "vcs_AB34CD",
      expiresAt: new Date("2026-07-30T16:00:00.000Z"),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(room.url).toContain("daily.co");
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [, init] = fetchImpl.mock.calls[0]!;
    const body = JSON.parse(String(init?.body)) as {
      privacy: string;
      name: string;
      properties: {
        enable_recording: boolean | string;
        enable_transcription_storage?: boolean;
        exp: number;
      };
    };
    expect(body.privacy).toBe("private");
    expect(body.name).toBe(opaqueDailyRoomName("vcs_AB34CD"));
    expect(body.properties.enable_recording).toBe("cloud");
    expect(body.properties.enable_transcription_storage).toBe(true);
    expect(body.properties.exp).toBe(
      Math.floor(Date.parse("2026-07-30T16:00:00.000Z") / 1000),
    );
  });

  it("reuses an existing Daily room when create returns 400", async () => {
    const name = opaqueDailyRoomName("vcs_RACE01");
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === "POST") {
        return Response.json({ error: "already exists" }, { status: 400 });
      }
      if (url.includes(`/rooms/${name}`)) {
        return Response.json({
          name,
          url: `https://example.daily.co/${name}`,
          created_at: "2026-07-30T11:00:00.000Z",
        });
      }
      return Response.json({ error: "unexpected" }, { status: 500 });
    });

    const room = await createPrivateDailyRoom({
      sessionId: "vcs_RACE01",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(room.name).toBe(name);
    expect(room.url).toBe(`https://example.daily.co/${name}`);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe("room ttl constant", () => {
  it("defaults to 4 hours", () => {
    expect(DAILY_ROOM_TTL_MS).toBe(4 * 60 * 60 * 1000);
  });
});
