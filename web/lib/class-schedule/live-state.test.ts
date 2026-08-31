import { describe, expect, it } from "vitest";
import { stateFromOpenClassSession } from "@/lib/class-schedule/live-state";
import type { LiveClassMeetingWindow } from "@/lib/class-schedule/next-meeting";
import type { VirtualClassroomSessionRecord } from "@/lib/virtual-classroom/domain";

const SESSION: VirtualClassroomSessionRecord = {
  id: "vcs_AB34CD",
  classId: "class-1",
  classLessonId: null,
  joinCode: "AB34CD",
  liveblocksRoomId: "wke-vc-session-AB34CD",
  title: "Virtual Classroom",
  status: "active",
  createdBy: "teacher-1",
  createdAt: "2026-08-31T02:00:00.000Z",
  endedAt: null,
  meetingSlotId: "slot-1",
  occurrenceStartsAt: "2026-08-31T03:00:00.000Z",
  occurrenceEndsAt: "2026-08-31T04:00:00.000Z",
  sessionKind: "scheduled",
  classPhase: "live",
};

const DIFFERENT_MEETING: LiveClassMeetingWindow = {
  startsAt: new Date("2026-09-01T03:00:00.000Z"),
  endsAt: new Date("2026-09-01T04:00:00.000Z"),
  slot: {
    id: "slot-2",
    classId: "class-1",
    teacherId: "teacher-1",
    weekday: 2,
    startTime: "10:00",
    durationMinutes: 60,
    timezone: "Asia/Ho_Chi_Minh",
  },
  label: "Tomorrow at 10:00 AM",
  source: "recurring",
};

describe("live classroom student visibility", () => {
  it("keeps an active live session visible even when schedule resolution is missing", () => {
    const state = stateFromOpenClassSession(SESSION, null);

    expect(state?.phase).toBe("live");
    expect(state?.canStudentEnterLive).toBe(true);
    expect(state?.sessionId).toBe(SESSION.id);
  });

  it("does not let a different resolved occurrence hide the teacher's active room", () => {
    const state = stateFromOpenClassSession(SESSION, DIFFERENT_MEETING);

    expect(state?.phase).toBe("live");
    expect(state?.canStudentEnterLive).toBe(true);
    expect(state?.occurrenceStartsAt).toBe(SESSION.occurrenceStartsAt);
    expect(state?.occurrenceLabel).toBeNull();
  });

  it("exposes waiting rooms only as waiting and keeps prep teacher-only", () => {
    const waiting = stateFromOpenClassSession(
      { ...SESSION, classPhase: "waiting" },
      null,
    );
    const prep = stateFromOpenClassSession(
      { ...SESSION, classPhase: "prep" },
      null,
    );

    expect(waiting?.canStudentEnterWaiting).toBe(true);
    expect(waiting?.canStudentEnterLive).toBe(false);
    expect(prep).toBeNull();
  });
});