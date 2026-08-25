import "server-only";

import {
  resolveLiveClassMeeting,
  type LiveClassMeetingWindow,
} from "@/lib/class-schedule/next-meeting";
import type {
  ClassMeetingSlot,
  ClassMeetingWeekday,
} from "@/lib/class-schedule/types";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";

export type TrialOccurrenceMeetingRow = {
  id: string;
  class_id: string;
  teacher_id: string;
  starts_at: string;
  duration_minutes: number;
  timezone: string;
};

const WEEKDAYS: Record<string, ClassMeetingWeekday> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Convert a persisted one-off trial occurrence into the class-clock meeting contract. */
export function trialOccurrenceToLiveMeeting(
  row: TrialOccurrenceMeetingRow,
  now = new Date(),
  options?: { lookAheadMs?: number; postEndGraceMs?: number },
): LiveClassMeetingWindow | null {
  const startsAt = new Date(row.starts_at);
  if (!Number.isFinite(startsAt.getTime())) return null;
  const durationMinutes = Math.max(15, Math.min(Number(row.duration_minutes) || 45, 240));
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);
  const lookAheadMs = options?.lookAheadMs ?? 24 * 60 * 60 * 1000;
  const postEndGraceMs = options?.postEndGraceMs ?? 15 * 60 * 1000;
  const nowMs = now.getTime();
  if (
    startsAt.getTime() - nowMs > lookAheadMs ||
    nowMs > endsAt.getTime() + postEndGraceMs
  ) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: row.timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(startsAt);
  const weekday = WEEKDAYS[parts.find((part) => part.type === "weekday")?.value ?? ""] ?? 0;
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  const slot: ClassMeetingSlot = {
    // Used for in-memory clock and dismissal matching only. class_sessions has
    // a FK to recurring slots, so this namespaced ID is never persisted there.
    id: `trial:${row.id}`,
    classId: row.class_id,
    teacherId: row.teacher_id,
    weekday,
    startTime: `${hour}:${minute}`,
    durationMinutes,
    timezone: row.timezone,
  };
  const label = new Intl.DateTimeFormat(undefined, {
    timeZone: row.timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(startsAt);

  return { startsAt, endsAt, slot, label, source: "trial" };
}

export async function resolveClassLiveMeeting(
  classId: string,
  recurringSlots: ClassMeetingSlot[],
  now = new Date(),
  options?: { lookAheadMs?: number; postEndGraceMs?: number },
): Promise<LiveClassMeetingWindow | null> {
  const supabase = createServiceRoleSupabase();
  if (supabase) {
    const { data } = await supabase
      .from("trial_occurrences")
      .select("id, class_id, teacher_id, starts_at, duration_minutes, timezone")
      .eq("class_id", classId)
      .maybeSingle();
    if (data) {
      const trial = trialOccurrenceToLiveMeeting(
        data as TrialOccurrenceMeetingRow,
        now,
        options,
      );
      if (trial) return trial;
    }
  }
  return resolveLiveClassMeeting(recurringSlots, now, options);
}
