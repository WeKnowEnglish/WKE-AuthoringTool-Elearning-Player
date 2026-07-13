import "server-only";

import type { NextResponse } from "next/server";

/** Adds same-origin request timing without exposing question or player details. */
export async function withLiveGameServerTiming(
  metric: string,
  operation: () => Promise<NextResponse>,
): Promise<NextResponse> {
  const startedAt = performance.now();
  const response = await operation();
  response.headers.append(
    "Server-Timing",
    `${metric};dur=${Math.max(0, performance.now() - startedAt).toFixed(1)}`,
  );
  return response;
}
