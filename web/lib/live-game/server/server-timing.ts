import "server-only";

import type { NextResponse } from "next/server";

export type LiveGameServerTimer = {
  measure<T>(metric: string, operation: () => Promise<T>): Promise<T>;
};

function safeMetric(metric: string): string {
  return metric.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/** Adds same-origin request timing without exposing question or player details. */
export async function withLiveGameServerTiming(
  metric: string,
  operation: (timer: LiveGameServerTimer) => Promise<NextResponse>,
): Promise<NextResponse> {
  const startedAt = performance.now();
  const entries: string[] = [];
  const timer: LiveGameServerTimer = {
    async measure<T>(stepMetric: string, step: () => Promise<T>): Promise<T> {
      const stepStartedAt = performance.now();
      try {
        return await step();
      } finally {
        entries.push(
          `${safeMetric(stepMetric)};dur=${Math.max(0, performance.now() - stepStartedAt).toFixed(1)}`,
        );
      }
    },
  };
  const response = await operation(timer);
  response.headers.append(
    "Server-Timing",
    `${metric};dur=${Math.max(0, performance.now() - startedAt).toFixed(1)}`,
  );
  for (const entry of entries) response.headers.append("Server-Timing", entry);
  return response;
}
