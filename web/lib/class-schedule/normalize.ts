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

/**
 * Interpret a datetime-local wall clock (`YYYY-MM-DDTHH:mm`) in an IANA zone
 * and return a UTC ISO string.
 */
export function wallClockInTimeZoneToUtcIso(
  wallLocal: string,
  timeZone: string,
): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(wallLocal.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (![year, month, day, hour, minute].every((n) => Number.isFinite(n))) return null;

  const zone = normalizeMeetingTimezone(timeZone);
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  for (let i = 0; i < 4; i += 1) {
    const parts = Object.fromEntries(
      dtf
        .formatToParts(new Date(utcMs))
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value]),
    ) as Record<string, string>;
    const asUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second ?? "0"),
    );
    const desired = Date.UTC(year, month - 1, day, hour, minute, 0);
    const diff = desired - asUtc;
    if (diff === 0) break;
    utcMs += diff;
  }

  return new Date(utcMs).toISOString();
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
