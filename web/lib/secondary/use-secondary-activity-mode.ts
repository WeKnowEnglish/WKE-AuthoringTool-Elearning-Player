"use client";

import { useSearchParams } from "next/navigation";
import { parseSecondaryActivitySearchParams } from "@/lib/secondary/secondary-activity-routes";

export function useSecondaryActivityMode() {
  const searchParams = useSearchParams();
  const { mode, retry } = parseSecondaryActivitySearchParams(searchParams);

  return {
    mode,
    retry,
    isReviewMode: mode === "review",
    isRetry: retry,
  };
}
