import { normalizeMeetingSlotInputs, normalizeMeetingTimezone } from "@/lib/class-schedule/normalize";
import type { ClassScheduleWindowInput } from "@/lib/class-schedule/preference-types";

const MAX_WINDOWS = 6;

export function normalizeScheduleWindowInputs(raw: unknown): ClassScheduleWindowInput[] {
  return normalizeMeetingSlotInputs(raw).slice(0, MAX_WINDOWS);
}

export function normalizeRankedWindowIds(
  raw: unknown,
  allowedIds: ReadonlySet<string>,
): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const id = typeof item === "string" ? item.trim() : "";
    if (!id || seen.has(id) || !allowedIds.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= 8) break;
  }
  return out;
}

export { normalizeMeetingTimezone };
