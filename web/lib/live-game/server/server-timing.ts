import "server-only";

export type LiveGameServerTimingContext = {
  roomId?: string;
  sessionId?: string;
  role?: string;
  routeType?: string;
  challengeIdHash?: string;
  idempotencyOutcome?: string;
  duplicateSubmission?: boolean;
  liveblocksCallCount?: number;
  liveblocksReadCount?: number;
  liveblocksMutateCount?: number;
  supabaseQueryCount?: number;
  rpcCount?: number;
  responseBytes?: number;
  resultReadyMs?: number;
  gameplayCommittedMs?: number;
  reportingCommittedMs?: number;
  correctnessSource?: string;
  responseStrategy?: string;
};

export type LiveGameServerTimer = {
  measure<T>(metric: string, operation: () => Promise<T> | T): Promise<T>;
  setContext(context: LiveGameServerTimingContext): void;
};

type StageEntry = {
  name: string;
  durationMs: number;
};

const EXPOSE_HEADERS = "Server-Timing, X-Server-Ms";

function safeMetric(metric: string): string {
  return metric.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function formatDuration(durationMs: number): string {
  return Math.max(0, durationMs).toFixed(1);
}

function buildServerTimingHeader(operation: string, totalMs: number, stages: StageEntry[]): string {
  const parts = [
    `${safeMetric(operation)};dur=${formatDuration(totalMs)}`,
    `total;dur=${formatDuration(totalMs)}`,
    ...stages.map((stage) => `${safeMetric(stage.name)};dur=${formatDuration(stage.durationMs)}`),
  ];
  return parts.join(", ");
}

function applyTimingHeaders(
  response: Response,
  operation: string,
  totalMs: number,
  stages: StageEntry[],
): void {
  const serverTiming = buildServerTimingHeader(operation, totalMs, stages);
  // Single combined Server-Timing value is more reliable than multiple appends:
  // some runtimes only surface the first header field to fetch().
  response.headers.set("Server-Timing", serverTiming);
  response.headers.set("X-Server-Ms", formatDuration(totalMs));
  const existingExpose = response.headers.get("Access-Control-Expose-Headers");
  if (!existingExpose) {
    response.headers.set("Access-Control-Expose-Headers", EXPOSE_HEADERS);
  } else if (!/Server-Timing/i.test(existingExpose) || !/X-Server-Ms/i.test(existingExpose)) {
    const parts = new Set(
      existingExpose
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
    );
    parts.add("Server-Timing");
    parts.add("X-Server-Ms");
    response.headers.set("Access-Control-Expose-Headers", [...parts].join(", "));
  }
}

function logServerTiming(input: {
  operation: string;
  status: number;
  totalMs: number;
  stages: StageEntry[];
  context: LiveGameServerTimingContext;
}): void {
  const stageMap = Object.fromEntries(
    input.stages.map((stage) => [stage.name, Number(formatDuration(stage.durationMs))]),
  );
  console.info(
    JSON.stringify({
      type: "live_game_server_timing",
      route: input.operation,
      operation: input.operation,
      status: input.status,
      totalMs: Number(formatDuration(input.totalMs)),
      stages: stageMap,
      roomId: input.context.roomId ?? null,
      sessionId: input.context.sessionId ?? null,
      role: input.context.role ?? null,
      routeType: input.context.routeType ?? null,
      challengeIdHash: input.context.challengeIdHash ?? null,
      idempotencyOutcome: input.context.idempotencyOutcome ?? null,
      duplicateSubmission: input.context.duplicateSubmission ?? null,
      liveblocksCallCount: input.context.liveblocksCallCount ?? null,
      liveblocksReadCount: input.context.liveblocksReadCount ?? null,
      liveblocksMutateCount: input.context.liveblocksMutateCount ?? null,
      supabaseQueryCount: input.context.supabaseQueryCount ?? null,
      rpcCount: input.context.rpcCount ?? null,
      responseBytes: input.context.responseBytes ?? null,
      resultReadyMs: input.context.resultReadyMs ?? null,
      gameplayCommittedMs: input.context.gameplayCommittedMs ?? null,
      reportingCommittedMs: input.context.reportingCommittedMs ?? null,
      correctnessSource: input.context.correctnessSource ?? null,
      responseStrategy: input.context.responseStrategy ?? null,
    }),
  );
}

/**
 * Wraps a live-game route handler, attaching Server-Timing + X-Server-Ms and a
 * structured Vercel log. Timing is applied to successful and expected error
 * responses returned from the handler. Thrown errors get a timed 503 shell when
 * `fallbackOnThrow` is used by the route (routes may catch themselves).
 */
export async function withLiveGameServerTiming(
  operation: string,
  handler: (timer: LiveGameServerTimer) => Promise<Response>,
): Promise<Response> {
  const startedAt = performance.now();
  const stages: StageEntry[] = [];
  const context: LiveGameServerTimingContext = {};

  const timer: LiveGameServerTimer = {
    async measure<T>(stepMetric: string, step: () => Promise<T> | T): Promise<T> {
      const stepStartedAt = performance.now();
      try {
        return await step();
      } finally {
        stages.push({
          name: safeMetric(stepMetric),
          durationMs: Math.max(0, performance.now() - stepStartedAt),
        });
      }
    },
    setContext(next) {
      if (next.roomId) context.roomId = next.roomId;
      if (next.sessionId) context.sessionId = next.sessionId;
      if (next.role) context.role = next.role;
      if (next.routeType) context.routeType = next.routeType;
      if (next.challengeIdHash) context.challengeIdHash = next.challengeIdHash;
      if (next.idempotencyOutcome !== undefined) context.idempotencyOutcome = next.idempotencyOutcome;
      if (next.duplicateSubmission !== undefined) {
        context.duplicateSubmission = next.duplicateSubmission;
      }
      if (next.liveblocksCallCount !== undefined) {
        context.liveblocksCallCount = next.liveblocksCallCount;
      }
      if (next.liveblocksReadCount !== undefined) {
        context.liveblocksReadCount = next.liveblocksReadCount;
      }
      if (next.liveblocksMutateCount !== undefined) {
        context.liveblocksMutateCount = next.liveblocksMutateCount;
      }
      if (next.supabaseQueryCount !== undefined) {
        context.supabaseQueryCount = next.supabaseQueryCount;
      }
      if (next.rpcCount !== undefined) context.rpcCount = next.rpcCount;
      if (next.responseBytes !== undefined) context.responseBytes = next.responseBytes;
      if (next.resultReadyMs !== undefined) context.resultReadyMs = next.resultReadyMs;
      if (next.gameplayCommittedMs !== undefined) {
        context.gameplayCommittedMs = next.gameplayCommittedMs;
      }
      if (next.reportingCommittedMs !== undefined) {
        context.reportingCommittedMs = next.reportingCommittedMs;
      }
      if (next.correctnessSource) context.correctnessSource = next.correctnessSource;
      if (next.responseStrategy) context.responseStrategy = next.responseStrategy;
    },
  };

  const response = await handler(timer);
  const totalMs = Math.max(0, performance.now() - startedAt);
  applyTimingHeaders(response, operation, totalMs, stages);
  logServerTiming({
    operation,
    status: response.status,
    totalMs,
    stages,
    context,
  });
  return response;
}

/** Apply timing headers to a Response created outside the wrapper (e.g. auth). */
export function attachLiveGameServerTiming(
  response: Response,
  operation: string,
  startedAt: number,
  stages: StageEntry[] = [],
  context: LiveGameServerTimingContext = {},
): Response {
  const totalMs = Math.max(0, performance.now() - startedAt);
  applyTimingHeaders(response, operation, totalMs, stages);
  logServerTiming({
    operation,
    status: response.status,
    totalMs,
    stages,
    context,
  });
  return response;
}

export function createLiveGameServerTimer(): {
  timer: LiveGameServerTimer;
  stages: StageEntry[];
  context: LiveGameServerTimingContext;
} {
  const stages: StageEntry[] = [];
  const context: LiveGameServerTimingContext = {};
  const timer: LiveGameServerTimer = {
    async measure<T>(stepMetric: string, step: () => Promise<T> | T): Promise<T> {
      const stepStartedAt = performance.now();
      try {
        return await step();
      } finally {
        stages.push({
          name: safeMetric(stepMetric),
          durationMs: Math.max(0, performance.now() - stepStartedAt),
        });
      }
    },
    setContext(next) {
      if (next.roomId) context.roomId = next.roomId;
      if (next.sessionId) context.sessionId = next.sessionId;
      if (next.role) context.role = next.role;
      if (next.routeType) context.routeType = next.routeType;
      if (next.challengeIdHash) context.challengeIdHash = next.challengeIdHash;
      if (next.idempotencyOutcome !== undefined) context.idempotencyOutcome = next.idempotencyOutcome;
      if (next.duplicateSubmission !== undefined) {
        context.duplicateSubmission = next.duplicateSubmission;
      }
      if (next.liveblocksCallCount !== undefined) {
        context.liveblocksCallCount = next.liveblocksCallCount;
      }
      if (next.liveblocksReadCount !== undefined) {
        context.liveblocksReadCount = next.liveblocksReadCount;
      }
      if (next.liveblocksMutateCount !== undefined) {
        context.liveblocksMutateCount = next.liveblocksMutateCount;
      }
      if (next.supabaseQueryCount !== undefined) {
        context.supabaseQueryCount = next.supabaseQueryCount;
      }
      if (next.rpcCount !== undefined) context.rpcCount = next.rpcCount;
      if (next.responseBytes !== undefined) context.responseBytes = next.responseBytes;
      if (next.resultReadyMs !== undefined) context.resultReadyMs = next.resultReadyMs;
      if (next.gameplayCommittedMs !== undefined) {
        context.gameplayCommittedMs = next.gameplayCommittedMs;
      }
      if (next.reportingCommittedMs !== undefined) {
        context.reportingCommittedMs = next.reportingCommittedMs;
      }
      if (next.correctnessSource) context.correctnessSource = next.correctnessSource;
      if (next.responseStrategy) context.responseStrategy = next.responseStrategy;
    },
  };
  return { timer, stages, context };
}

/** Test helpers — keep pure formatting logic exerciseable without Response. */
export const __liveGameServerTimingTestUtils = {
  safeMetric,
  formatDuration,
  buildServerTimingHeader,
  applyTimingHeaders,
};
