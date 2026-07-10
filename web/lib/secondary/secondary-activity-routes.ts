import { SECONDARY_ACTIVITY_HREF } from "@/lib/secondary/secondary-study-activity";
import type { SecondaryTodayActivityKey } from "@/lib/secondary/types";

export type SecondaryActivityPageMode = "practice" | "review";

export function parseSecondaryActivitySearchParams(searchParams: {
  get(name: string): string | null;
}): { mode: SecondaryActivityPageMode; retry: boolean } {
  const mode = searchParams.get("mode") === "review" ? "review" : "practice";
  const retry = searchParams.get("retry") === "1";
  return { mode, retry };
}

export function buildSecondaryActivityHref(
  activityKey: SecondaryTodayActivityKey,
  options?: { mode?: "review"; retry?: boolean },
): string {
  const base = SECONDARY_ACTIVITY_HREF[activityKey];
  const params = new URLSearchParams();
  if (options?.mode === "review") params.set("mode", "review");
  if (options?.retry) params.set("retry", "1");
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}
