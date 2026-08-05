import "server-only";

import {
  CLASS_LIVE_OPEN_MS,
  CLASS_TEACHER_EARLY_MS,
  CLASS_WAITING_OPEN_MS,
  clockPhaseToSessionPhase,
  deriveScheduledClockPhase,
  type ClassSessionPhase,
} from "@/lib/class-schedule/class-clock";
import { getClassLiveState } from "@/lib/class-schedule/live-state";
import { resolveLiveClassMeeting } from "@/lib/class-schedule/next-meeting";
import { listMeetingSlotsForClassServiceRole } from "@/lib/daily/schedule-bind";
import { occurrenceStartsMatch } from "@/lib/class-schedule/occurrence-match";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import { bootstrapVirtualClassroomHost } from "@/lib/virtual-classroom/server/host-bootstrap";
import { finalizeVirtualClassroomSessionClose } from "@/lib/virtual-classroom/server/close-session";
import type { VirtualClassroomSessionRecord } from "@/lib/virtual-classroom/domain";
import {
  getActiveVirtualClassroomForClass,
  hasTeacherDismissedOccurrence,
  updateVirtualClassroomSessionPhase,
} from "@/lib/virtual-classroom/server/session";

export type EnsureClassSessionResult = {
  session: VirtualClassroomSessionRecord | null;
  created: boolean;
  promoted: boolean;
  phase: ClassSessionPhase | null;
};

async function resolveClassTeacher(
  classId: string,
): Promise<{ userId: string; displayName: string } | null> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return null;
  const { data } = await supabase
    .from("teacher_classes")
    .select("teacher_id")
    .eq("id", classId)
    .maybeSingle();
  const teacherId = data?.teacher_id as string | undefined;
  if (!teacherId) return null;
  return { userId: teacherId, displayName: "Teacher" };
}

/**
 * Ensure a scheduled class has a VC session in the right phase for the clock.
 * - Creates at/after T−15 (waiting) or T−5 (live)
 * - Promotes waiting/prep → live at T−5
 * - Teacher early open uses mode "early" → prep/waiting without forcing live
 * - mode "live" forces class_phase live (Start now)
 * - mode "extra" starts an unscheduled live session (no meeting slot required)
 */
export async function ensureClassSessionForClock(input: {
  classId: string;
  mode?: "auto" | "early" | "live" | "extra";
  classLessonId?: string | null;
  title?: string;
  teacher?: { userId: string; displayName: string };
  nowMs?: number;
}): Promise<EnsureClassSessionResult> {
  const nowMs = input.nowMs ?? Date.now();
  const mode = input.mode ?? "auto";
  let active = await getActiveVirtualClassroomForClass(input.classId);

  // Unscheduled / temporary sessions do not need a meeting window.
  if (mode === "extra") {
    const teacher =
      input.teacher ?? (await resolveClassTeacher(input.classId));
    if (!teacher) {
      return {
        session: active,
        created: false,
        promoted: false,
        phase: active?.classPhase ?? null,
      };
    }
    await bootstrapVirtualClassroomHost({
      teacher,
      classId: input.classId,
      classLessonId: input.classLessonId,
      title: input.title,
      sessionKind: "extra",
      classPhase: "live",
    });
    active = await getActiveVirtualClassroomForClass(input.classId);
    return {
      session: active,
      created: true,
      promoted: false,
      phase: "live",
    };
  }

  const slots = await listMeetingSlotsForClassServiceRole(input.classId);
  const meeting = resolveLiveClassMeeting(slots, new Date(nowMs));

  if (!meeting) {
    return {
      session: active,
      created: false,
      promoted: false,
      phase: active?.classPhase ?? null,
    };
  }

  const clock = deriveScheduledClockPhase({
    occurrenceStartsAt: meeting.startsAt,
    occurrenceEndsAt: meeting.endsAt,
    nowMs,
  });

  if (mode === "auto") {
    if (clock === "past" && active) {
      await finalizeVirtualClassroomSessionClose(active);
      active = null;
    }
    if (clock === "idle" || clock === "past") {
      return {
        session: active,
        created: false,
        promoted: false,
        phase: active?.classPhase ?? (clock === "past" ? "ended" : null),
      };
    }
  }

  if (mode === "early") {
    const startMs = meeting.startsAt.getTime();
    if (nowMs < startMs - CLASS_TEACHER_EARLY_MS) {
      throw new Error("Too early to open the classroom for this class.");
    }
  }

  const forceLive = mode === "live" || clock === "live";
  const targetPhase: ClassSessionPhase =
    mode === "early" && !forceLive
      ? clock === "waiting"
        ? "waiting"
        : "prep"
      : clockPhaseToSessionPhase(clock, forceLive);

  if (
    active &&
    active.sessionKind === "scheduled" &&
    active.occurrenceStartsAt &&
    occurrenceStartsMatch(active.occurrenceStartsAt, meeting.startsAt)
  ) {
    let promoted = false;
    if (
      active.classPhase !== targetPhase &&
      targetPhase !== "ended" &&
      (targetPhase === "live" ||
        (targetPhase === "waiting" && active.classPhase === "prep"))
    ) {
      const updated = await updateVirtualClassroomSessionPhase(
        active.id,
        targetPhase,
      );
      promoted = Boolean(updated);
      active = updated ?? active;
    } else if (forceLive && active.classPhase !== "live") {
      const updated = await updateVirtualClassroomSessionPhase(active.id, "live");
      promoted = Boolean(updated);
      active = updated ?? active;
    }
    return {
      session: active,
      created: false,
      promoted,
      phase: active.classPhase,
    };
  }

  // Create new scheduled session when entering waiting/live (or early prep).
  if (
    mode === "auto" &&
    clock !== "waiting" &&
    clock !== "live"
  ) {
    return {
      session: active,
      created: false,
      promoted: false,
      phase: active?.classPhase ?? null,
    };
  }

  const teacher =
    input.teacher ?? (await resolveClassTeacher(input.classId));
  if (!teacher) {
    return { session: active, created: false, promoted: false, phase: null };
  }

  if (
    mode === "auto" &&
    (await hasTeacherDismissedOccurrence({
      classId: input.classId,
      meetingSlotId: meeting.slot.id,
      occurrenceStartsAt: meeting.startsAt,
      occurrenceEndsAt: meeting.endsAt,
    }))
  ) {
    return {
      session: null,
      created: false,
      promoted: false,
      phase: null,
    };
  }

  await bootstrapVirtualClassroomHost({
    teacher,
    classId: input.classId,
    classLessonId: input.classLessonId,
    title: input.title ?? meeting.label,
    meetingSlotId: meeting.slot.id,
    occurrenceStartsAt: meeting.startsAt.toISOString(),
    occurrenceEndsAt: meeting.endsAt.toISOString(),
    sessionKind: "scheduled",
    classPhase: targetPhase,
  });

  active = await getActiveVirtualClassroomForClass(input.classId);
  return {
    session: active,
    created: true,
    promoted: false,
    phase: active?.classPhase ?? targetPhase,
  };
}

/** Cron / lazy: for one class, open waiting at T−15 and promote at T−5. */
export async function tickClassClock(classId: string, nowMs = Date.now()) {
  const state = await getClassLiveState(classId, nowMs);
  if (state.phase === "waiting" || state.phase === "live") {
    return ensureClassSessionForClock({ classId, mode: "auto", nowMs });
  }
  return {
    session: null as VirtualClassroomSessionRecord | null,
    created: false,
    promoted: false,
    phase: null,
  } satisfies EnsureClassSessionResult;
}

export async function listClassIdsWithUpcomingSlots(
  nowMs = Date.now(),
): Promise<string[]> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("class_meeting_slots")
    .select("class_id")
    .limit(500);
  const ids = [...new Set((data ?? []).map((r) => r.class_id as string))];
  const due: string[] = [];
  for (const classId of ids) {
    const slots = await listMeetingSlotsForClassServiceRole(classId);
    const meeting = resolveLiveClassMeeting(slots, new Date(nowMs), {
      lookAheadMs: CLASS_WAITING_OPEN_MS + 60_000,
      postEndGraceMs: 15 * 60 * 1000,
    });
    if (!meeting) continue;
    const start = meeting.startsAt.getTime();
    if (
      nowMs >= start - CLASS_WAITING_OPEN_MS &&
      nowMs <= meeting.endsAt.getTime() + 15 * 60 * 1000
    ) {
      due.push(classId);
    }
  }
  return due;
}

export {
  CLASS_LIVE_OPEN_MS,
  CLASS_WAITING_OPEN_MS,
  CLASS_TEACHER_EARLY_MS,
};
