import "server-only";

import {
  normalizeMeetingDuration,
  normalizeMeetingStartTime,
  normalizeMeetingTimezone,
} from "@/lib/class-schedule/normalize";
import {
  resolveLiveClassMeeting,
  type LiveClassMeetingWindow,
} from "@/lib/class-schedule/next-meeting";
import type {
  ClassMeetingSlot,
  ClassMeetingWeekday,
} from "@/lib/class-schedule/types";
import {
  computeDailyRoomExpiresAt,
  computeScheduledDailyRoomExpiresAt,
  POST_CLASS_ROOM_GRACE_MS,
  SCHEDULE_LOOKAHEAD_MS,
} from "@/lib/daily/join-window";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";

type SlotRow = {
  id: string;
  class_id: string;
  teacher_id: string;
  weekday: number;
  start_time: string;
  duration_minutes: number;
  timezone: string;
};

function isWeekday(value: number): value is ClassMeetingWeekday {
  return value >= 0 && value <= 6;
}

function mapSlot(row: SlotRow): ClassMeetingSlot | null {
  if (!isWeekday(row.weekday)) return null;
  const startTime = normalizeMeetingStartTime(String(row.start_time).slice(0, 5));
  if (!startTime) return null;
  return {
    id: row.id,
    classId: row.class_id,
    teacherId: row.teacher_id,
    weekday: row.weekday,
    startTime,
    durationMinutes: normalizeMeetingDuration(row.duration_minutes),
    timezone: normalizeMeetingTimezone(row.timezone),
  };
}

export async function listMeetingSlotsForClassServiceRole(
  classId: string,
): Promise<ClassMeetingSlot[]> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("class_meeting_slots")
    .select("id, class_id, teacher_id, weekday, start_time, duration_minutes, timezone")
    .eq("class_id", classId)
    .order("weekday", { ascending: true })
    .order("start_time", { ascending: true });

  if (error || !data) return [];
  return (data as SlotRow[])
    .map(mapSlot)
    .filter((slot): slot is ClassMeetingSlot => slot !== null);
}

export type DailyScheduleBind = {
  live: LiveClassMeetingWindow;
  roomExpiresAt: Date;
};

/**
 * When a class-linked VC has a nearby weekly slot, bind room TTL + early-join
 * to that occurrence. Otherwise null → ad-hoc 4h room rules.
 */
export async function resolveDailyScheduleBind(input: {
  classId: string | null;
  createdAt?: Date | string | null;
  nowMs?: number;
}): Promise<DailyScheduleBind | null> {
  if (!input.classId) return null;
  const now = new Date(input.nowMs ?? Date.now());
  const slots = await listMeetingSlotsForClassServiceRole(input.classId);
  const live = resolveLiveClassMeeting(slots, now, {
    lookAheadMs: SCHEDULE_LOOKAHEAD_MS,
    postEndGraceMs: POST_CLASS_ROOM_GRACE_MS,
  });
  if (!live) return null;

  const createdAt = input.createdAt
    ? new Date(input.createdAt)
    : now;

  return {
    live,
    roomExpiresAt: computeScheduledDailyRoomExpiresAt({
      createdAt,
      scheduledEndsAt: live.endsAt,
      nowMs: now.getTime(),
    }),
  };
}

export function adHocDailyRoomExpiresAt(createdAt: Date = new Date()): Date {
  return computeDailyRoomExpiresAt(createdAt);
}
