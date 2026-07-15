/** Shared Server-Timing / X-Server-Ms parsers (safe for client and tests). */

export type ParsedServerTimingMetric = {
  name: string;
  durationMs: number;
};

/**
 * Parse a Server-Timing header value.
 * Tolerates missing/malformed input, decimal durations, and duplicate names
 * (last occurrence wins for resolveServerMs; all entries are returned).
 */
export function parseServerTimingHeader(value: string | null | undefined): ParsedServerTimingMetric[] {
  if (!value || typeof value !== "string") return [];
  const metrics: ParsedServerTimingMetric[] = [];
  for (const part of value.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const segments = trimmed.split(";");
    const rawName = segments[0]?.trim() ?? "";
    if (!rawName) continue;
    const durationParam = segments.slice(1).find((param) => param.trim().toLowerCase().startsWith("dur="));
    if (!durationParam) continue;
    const rawDur = durationParam.trim().slice(4).trim();
    const durationMs = Number(rawDur);
    if (!Number.isFinite(durationMs) || durationMs < 0) continue;
    metrics.push({ name: rawName, durationMs });
  }
  return metrics;
}

export function parseServerMsHeader(value: string | null | undefined): number | null {
  if (!value || typeof value !== "string") return null;
  const durationMs = Number(value.trim());
  if (!Number.isFinite(durationMs) || durationMs < 0) return null;
  return durationMs;
}

/**
 * Prefer X-Server-Ms, then a metric named "total", then the max Server-Timing duration.
 */
export function resolveServerMs(
  serverMsHeader: string | null | undefined,
  serverTimingHeader: string | null | undefined,
): { serverMs: number | null; metrics: ParsedServerTimingMetric[] } {
  const metrics = parseServerTimingHeader(serverTimingHeader);
  const fromHeader = parseServerMsHeader(serverMsHeader);
  if (fromHeader != null) {
    return { serverMs: fromHeader, metrics };
  }
  if (metrics.length === 0) {
    return { serverMs: null, metrics };
  }
  const totalMetric = [...metrics].reverse().find((metric) => metric.name === "total");
  if (totalMetric) {
    return { serverMs: totalMetric.durationMs, metrics };
  }
  return {
    serverMs: metrics.reduce((max, metric) => Math.max(max, metric.durationMs), 0),
    metrics,
  };
}
