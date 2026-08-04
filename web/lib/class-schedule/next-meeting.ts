import {
  CLASS_MEETING_WEEKDAY_LABELS,
  CLASS_MEETING_WEEKDAY_SHORT,
  type ClassMeetingSlot,
  type ClassMeetingWeekday,
  type StudentNextClassMeeting,
} from "@/lib/class-schedule/types";

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: ClassMeetingWeekday;
};

const WEEKDAY_TO_SHORT: Record<string, ClassMeetingWeekday> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getZonedParts(date: Date, timeZone: string): ZonedParts | null {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  const weekdayShort = parts.find((part) => part.type === "weekday")?.value ?? "";
  const weekday = WEEKDAY_TO_SHORT[weekdayShort];
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    weekday === undefined
  ) {
    return null;
  }
  return { year, month, day, hour, minute, weekday };
}

function makeZonedDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date | null {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);
  for (let offsetHours = -14; offsetHours <= 14; offsetHours++) {
    const candidate = new Date(utcGuess - offsetHours * 60 * 60 * 1000);
    const parts = getZonedParts(candidate, timeZone);
    if (
      parts &&
      parts.year === year &&
      parts.month === month &&
      parts.day === day &&
      parts.hour === hour &&
      parts.minute === minute
    ) {
      return candidate;
    }
  }
  return null;
}

function parseStartTime(startTime: string): { hour: number; minute: number } | null {
  const [hourRaw, minuteRaw] = startTime.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return { hour, minute };
}

function formatMeetingTime(startTime: string, timeZone: string, startsAt: Date): string {
  const [hour, minute] = startTime.split(":").map(Number);
  const date = makeZonedDate(
    getZonedParts(startsAt, timeZone)?.year ?? startsAt.getUTCFullYear(),
    getZonedParts(startsAt, timeZone)?.month ?? 1,
    getZonedParts(startsAt, timeZone)?.day ?? 1,
    hour,
    minute,
    timeZone,
  );
  if (!date) return startTime;
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatNextMeetingLabel(slot: ClassMeetingSlot, startsAt: Date): string {
  const timeLabel = formatMeetingTime(slot.startTime, slot.timezone, startsAt);
  const zonedNow = getZonedParts(new Date(), slot.timezone);
  const zonedStart = getZonedParts(startsAt, slot.timezone);
  if (zonedNow && zonedStart) {
    const sameDay =
      zonedNow.year === zonedStart.year &&
      zonedNow.month === zonedStart.month &&
      zonedNow.day === zonedStart.day;
    if (sameDay) return `Today at ${timeLabel}`;
    const tomorrow = new Date(startsAt.getTime() - 24 * 60 * 60 * 1000);
    const zonedTomorrow = getZonedParts(tomorrow, slot.timezone);
    const isTomorrow =
      zonedTomorrow &&
      zonedTomorrow.year === zonedStart.year &&
      zonedTomorrow.month === zonedStart.month &&
      zonedTomorrow.day === zonedStart.day;
    if (isTomorrow) return `Tomorrow at ${timeLabel}`;
  }
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    timeZone: slot.timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(startsAt);
  return `${dateLabel} at ${timeLabel}`;
}

function nextOccurrenceForSlot(slot: ClassMeetingSlot, now: Date): Date | null {
  const time = parseStartTime(slot.startTime);
  if (!time) return null;

  const zonedNow = getZonedParts(now, slot.timezone);
  if (!zonedNow) return null;

  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const probe = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const parts = getZonedParts(probe, slot.timezone);
    if (!parts || parts.weekday !== slot.weekday) continue;
    const candidate = makeZonedDate(
      parts.year,
      parts.month,
      parts.day,
      time.hour,
      time.minute,
      slot.timezone,
    );
    if (candidate && candidate > now) return candidate;
  }

  return null;
}

export function resolveNextClassMeeting(
  slots: ClassMeetingSlot[],
  now = new Date(),
): StudentNextClassMeeting | null {
  if (!slots.length) return null;

  let bestSlot: ClassMeetingSlot | null = null;
  let bestAt: Date | null = null;

  for (const slot of slots) {
    const at = nextOccurrenceForSlot(slot, now);
    if (!at) continue;
    if (!bestAt || at < bestAt) {
      bestAt = at;
      bestSlot = slot;
    }
  }

  if (!bestSlot || !bestAt) return null;

  return {
    startsAt: bestAt.toISOString(),
    weekday: bestSlot.weekday,
    startTime: bestSlot.startTime,
    durationMinutes: bestSlot.durationMinutes,
    timezone: bestSlot.timezone,
    label: formatNextMeetingLabel(bestSlot, bestAt),
  };
}

export type LiveClassMeetingWindow = {
  startsAt: Date;
  endsAt: Date;
  slot: ClassMeetingSlot;
  label: string;
};

/**
 * In-progress or soon upcoming weekly occurrence for live video join windows.
 * Unlike resolveNextClassMeeting, includes a class that already started but has not ended.
 */
export function resolveLiveClassMeeting(
  slots: ClassMeetingSlot[],
  now = new Date(),
  options?: {
    /** How far ahead a future start may be to count as “this session’s slot”. */
    lookAheadMs?: number;
    /** Keep a meeting eligible this long after scheduled end (room soft close). */
    postEndGraceMs?: number;
  },
): LiveClassMeetingWindow | null {
  if (!slots.length) return null;
  const lookAheadMs = options?.lookAheadMs ?? 24 * 60 * 60 * 1000;
  const postEndGraceMs = options?.postEndGraceMs ?? 15 * 60 * 1000;
  const nowMs = now.getTime();

  type Candidate = LiveClassMeetingWindow & { priority: number };
  const candidates: Candidate[] = [];

  for (const slot of slots) {
    const time = parseStartTime(slot.startTime);
    if (!time) continue;

    for (let dayOffset = -1; dayOffset <= 8; dayOffset++) {
      const probe = new Date(nowMs + dayOffset * 24 * 60 * 60 * 1000);
      const parts = getZonedParts(probe, slot.timezone);
      if (!parts || parts.weekday !== slot.weekday) continue;

      const startsAt = makeZonedDate(
        parts.year,
        parts.month,
        parts.day,
        time.hour,
        time.minute,
        slot.timezone,
      );
      if (!startsAt) continue;

      const endsAt = new Date(
        startsAt.getTime() + slot.durationMinutes * 60 * 1000,
      );
      const softEnd = endsAt.getTime() + postEndGraceMs;
      const startMs = startsAt.getTime();

      const inProgressOrSoftClose = nowMs >= startMs && nowMs <= softEnd;
      const upcomingSoon =
        startMs > nowMs && startMs - nowMs <= lookAheadMs;

      if (!inProgressOrSoftClose && !upcomingSoon) continue;

      candidates.push({
        startsAt,
        endsAt,
        slot,
        label: formatNextMeetingLabel(slot, startsAt),
        // Prefer in-progress, then soonest start.
        priority: inProgressOrSoftClose ? 0 : 1,
      });
    }
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.startsAt.getTime() - b.startsAt.getTime();
  });
  const best = candidates[0]!;
  return {
    startsAt: best.startsAt,
    endsAt: best.endsAt,
    slot: best.slot,
    label: best.label,
  };
}

export function formatWeeklySlotLabel(slot: ClassMeetingSlot): string {
  const [hour, minute] = slot.startTime.split(":").map(Number);
  const anchor = makeZonedDate(2026, 1, 4 + slot.weekday, hour, minute, slot.timezone);
  const timeLabel = anchor
    ? new Intl.DateTimeFormat(undefined, {
        timeZone: slot.timezone,
        hour: "numeric",
        minute: "2-digit",
      }).format(anchor)
    : slot.startTime;
  return `${CLASS_MEETING_WEEKDAY_LABELS[slot.weekday]} ${timeLabel}`;
}

export function formatWeeklySlotShort(slot: ClassMeetingSlot): string {
  const [hour, minute] = slot.startTime.split(":").map(Number);
  const anchor = makeZonedDate(2026, 1, 4 + slot.weekday, hour, minute, slot.timezone);
  const timeLabel = anchor
    ? new Intl.DateTimeFormat(undefined, {
        timeZone: slot.timezone,
        hour: "numeric",
        minute: "2-digit",
      }).format(anchor)
    : slot.startTime;
  return `${CLASS_MEETING_WEEKDAY_SHORT[slot.weekday]} ${timeLabel}`;
}
