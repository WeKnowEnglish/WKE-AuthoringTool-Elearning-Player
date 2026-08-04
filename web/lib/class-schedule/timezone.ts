/** Legacy / alias IANA names → canonical preset when we have one. */
const TIMEZONE_ALIASES: Record<string, string> = {
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
};

function canonicalizeTimeZone(zone: string): string {
  return TIMEZONE_ALIASES[zone] ?? zone;
}

/** Browser IANA timezone, or null when unavailable. */
export function detectBrowserTimeZone(): string | null {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (typeof zone !== "string" || !zone.trim()) return null;
    return canonicalizeTimeZone(zone.trim());
  } catch {
    return null;
  }
}

export const CLASS_SCHEDULE_TIMEZONE_PRESETS = [
  "Asia/Bangkok",
  "Asia/Ho_Chi_Minh",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
] as const;

/** Presets plus optional detected zone, de-duplicated. */
export function classScheduleTimezoneOptions(
  detected: string | null | undefined,
): string[] {
  const options: string[] = [...CLASS_SCHEDULE_TIMEZONE_PRESETS];
  const raw = detected?.trim();
  if (!raw) return options;
  const zone = canonicalizeTimeZone(raw);
  if (!options.includes(zone)) {
    options.unshift(zone);
  }
  return options;
}
