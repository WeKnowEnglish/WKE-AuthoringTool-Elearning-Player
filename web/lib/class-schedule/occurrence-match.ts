/** Compare scheduled occurrence instants (tolerant of clock skew / ISO formatting). */
export function occurrenceStartsMatch(
  a: string | Date | null | undefined,
  b: string | Date | null | undefined,
  toleranceMs = 60_000,
): boolean {
  if (!a || !b) return false;
  const ams = typeof a === "string" ? new Date(a).getTime() : a.getTime();
  const bms = typeof b === "string" ? new Date(b).getTime() : b.getTime();
  if (!Number.isFinite(ams) || !Number.isFinite(bms)) return false;
  return Math.abs(ams - bms) <= toleranceMs;
}
