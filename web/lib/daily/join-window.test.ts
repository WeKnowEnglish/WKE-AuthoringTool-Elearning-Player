import { describe, expect, it } from "vitest";
import { resolveLiveClassMeeting } from "@/lib/class-schedule/next-meeting";
import type { ClassMeetingSlot } from "@/lib/class-schedule/types";
import {
  computeMeetingTokenExpUnix,
  computeScheduledDailyRoomExpiresAt,
  DAILY_TOKEN_GRACE_MS,
  DAILY_TOKEN_TTL_MS,
  evaluateSessionJoinability,
  STUDENT_EARLY_JOIN_MS,
  TEACHER_EARLY_JOIN_MS,
} from "@/lib/daily/join-window";

function slot(partial: Partial<ClassMeetingSlot> & Pick<ClassMeetingSlot, "weekday" | "startTime">): ClassMeetingSlot {
  return {
    id: "slot-1",
    classId: "class-1",
    teacherId: "teacher-1",
    durationMinutes: 60,
    timezone: "UTC",
    ...partial,
  };
}

describe("evaluateSessionJoinability Phase 2b", () => {
  const now = Date.parse("2026-07-30T12:00:00.000Z");

  it("refuses when endedAt is set even if status is active", () => {
    expect(
      evaluateSessionJoinability({
        status: "active",
        endedAt: "2026-07-30T11:00:00.000Z",
        nowMs: now,
      }),
    ).toMatchObject({ ok: false, code: "session_ended" });
  });

  it("enforces role-based early join against schedule", () => {
    const startsAt = new Date(now + 20 * 60 * 1000).toISOString(); // 20 min out

    expect(
      evaluateSessionJoinability({
        status: "active",
        scheduledStartsAt: startsAt,
        role: "teacher",
        nowMs: now,
      }),
    ).toEqual({ ok: true });

    expect(
      evaluateSessionJoinability({
        status: "active",
        scheduledStartsAt: startsAt,
        role: "student",
        nowMs: now,
      }),
    ).toMatchObject({ ok: false, code: "too_early" });

    const far = new Date(now + TEACHER_EARLY_JOIN_MS + 60_000).toISOString();
    expect(
      evaluateSessionJoinability({
        status: "active",
        scheduledStartsAt: far,
        role: "teacher",
        nowMs: now,
      }),
    ).toMatchObject({ ok: false, code: "too_early" });

    const studentOk = new Date(now + STUDENT_EARLY_JOIN_MS - 30_000).toISOString();
    expect(
      evaluateSessionJoinability({
        status: "active",
        scheduledStartsAt: studentOk,
        role: "student",
        nowMs: now,
      }),
    ).toEqual({ ok: true });
  });

  it("uses 5-minute soft grace after room expiry", () => {
    const within = new Date(now - DAILY_TOKEN_GRACE_MS / 2).toISOString();
    expect(
      evaluateSessionJoinability({
        status: "active",
        roomExpiresAt: within,
        nowMs: now,
      }),
    ).toEqual({ ok: true });

    const past = new Date(now - DAILY_TOKEN_GRACE_MS - 1).toISOString();
    expect(
      evaluateSessionJoinability({
        status: "active",
        roomExpiresAt: past,
        nowMs: now,
      }),
    ).toMatchObject({ ok: false, code: "room_expired" });
  });
});

describe("computeMeetingTokenExpUnix Phase 2b", () => {
  it("drops grace when sessionEnded", () => {
    const now = Date.parse("2026-07-30T12:00:00.000Z");
    const roomExpiresAt = new Date(now + 10 * 60 * 1000).toISOString();
    const withGrace = computeMeetingTokenExpUnix({ nowMs: now, roomExpiresAt });
    const noGrace = computeMeetingTokenExpUnix({
      nowMs: now,
      roomExpiresAt,
      sessionEnded: true,
    });
    expect(withGrace).toBe(
      Math.floor(
        Math.min(now + DAILY_TOKEN_TTL_MS, now + 10 * 60 * 1000 + DAILY_TOKEN_GRACE_MS) /
          1000,
      ),
    );
    expect(noGrace).toBe(
      Math.floor(Math.min(now + DAILY_TOKEN_TTL_MS, now + 10 * 60 * 1000) / 1000),
    );
  });
});

describe("computeScheduledDailyRoomExpiresAt", () => {
  it("uses scheduled end + grace", () => {
    const createdAt = new Date("2026-07-30T10:00:00.000Z");
    const scheduledEndsAt = new Date("2026-07-30T11:00:00.000Z");
    const exp = computeScheduledDailyRoomExpiresAt({
      createdAt,
      scheduledEndsAt,
      nowMs: createdAt.getTime(),
    });
    expect(exp.toISOString()).toBe("2026-07-30T11:15:00.000Z");
  });

  it("keeps afternoon classes alive when the room is created in the morning", () => {
    const createdAt = new Date("2026-07-30T10:00:00.000Z");
    const scheduledEndsAt = new Date("2026-07-30T16:00:00.000Z");
    const exp = computeScheduledDailyRoomExpiresAt({
      createdAt,
      scheduledEndsAt,
      nowMs: createdAt.getTime(),
    });
    // Must reach class end + 15m, not die at create+4h (14:00).
    expect(exp.toISOString()).toBe("2026-07-30T16:15:00.000Z");
  });
});

describe("resolveLiveClassMeeting", () => {
  it("returns an in-progress occurrence", () => {
    // Wednesday 2026-07-29 is weekday 3; use a fixed Wednesday noon UTC.
    const now = new Date("2026-07-29T12:30:00.000Z"); // Wed
    const live = resolveLiveClassMeeting(
      [slot({ weekday: 3, startTime: "12:00", durationMinutes: 60, timezone: "UTC" })],
      now,
    );
    expect(live).not.toBeNull();
    expect(live!.startsAt.toISOString()).toBe("2026-07-29T12:00:00.000Z");
    expect(live!.endsAt.toISOString()).toBe("2026-07-29T13:00:00.000Z");
  });

  it("returns null when next slot is beyond lookahead", () => {
    const now = new Date("2026-07-29T12:00:00.000Z"); // Wed
    const live = resolveLiveClassMeeting(
      [slot({ weekday: 1, startTime: "12:00", durationMinutes: 60, timezone: "UTC" })],
      now,
      { lookAheadMs: 6 * 60 * 60 * 1000 },
    );
    // Next Monday is > 6h away
    expect(live).toBeNull();
  });
});
