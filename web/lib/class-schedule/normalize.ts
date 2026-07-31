import {
  CLASS_MEETING_WEEKDAYS,
  DEFAULT_CLASS_MEETING_TIMEZONE,
  type ClassMeetingSlotInput,
  type ClassMeetingWeekday,
} from "@/lib/class-schedule/types";

const MAX_SLOTS = 7;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isWeekday(value: number): value is ClassMeetingWeekday {
  return (CLASS_MEETING_WEEKDAYS as readonly number[]).includes(value);
}

export function normalizeMeetingTimezone(raw: unknown): string {
  if (typeof raw !== "string") return DEFAULT_CLASS_MEETING_TIMEZONE;
  const trimmed = raw.trim();
  return trimmed.length >= 3 && trimmed.length <= 64 ? trimmed : DEFAULT_CLASS_MEETING_TIMEZONE;
}

export function normalizeMeetingStartTime(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!TIME_RE.test(trimmed)) return null;
  return trimmed;
}

export function normalizeMeetingDuration(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return 60;
  return Math.min(240, Math.max(15, Math.round(raw)));
}

export function normalizeMeetingSlotInputs(raw: unknown): ClassMeetingSlotInput[] {
  if (!Array.isArray(raw)) return [];
  const out: ClassMeetingSlotInput[] = [];
  const seen = new Set<string>();

  for (const item of raw.slice(0, MAX_SLOTS)) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const weekdayRaw =
      typeof row.weekday === "number" ? row.weekday : Number.parseInt(String(row.weekday), 10);
    if (!isWeekday(weekdayRaw)) continue;
    const startTime = normalizeMeetingStartTime(row.startTime);
    if (!startTime) continue;
    const key = `${weekdayRaw}-${startTime}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      weekday: weekdayRaw,
      startTime,
      durationMinutes: normalizeMeetingDuration(row.durationMinutes),
    });
  }

  return out.sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime));
}
