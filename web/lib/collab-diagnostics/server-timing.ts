import "server-only";

export type CollabServerTimingContext = {
  activity?: "whiteboard" | "document" | "classroom";
  sessionId?: string;
  roomId?: string;
  boardId?: string;
  commandType?: string;
  role?: string;
  classId?: string | null;
};

export type CollabServerTimer = {
  measure<T>(metric: string, operation: () => Promise<T> | T): Promise<T>;
  setContext(context: CollabServerTimingContext): void;
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
  return [
    `${safeMetric(operation)};dur=${formatDuration(totalMs)}`,
    `total;dur=${formatDuration(totalMs)}`,
    ...stages.map((stage) => `${safeMetric(stage.name)};dur=${formatDuration(stage.durationMs)}`),
  ].join(", ");
}

function applyTimingHeaders(
  response: Response,
  operation: string,
  totalMs: number,
  stages: StageEntry[],
): void {
  response.headers.set("Server-Timing", buildServerTimingHeader(operation, totalMs, stages));
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
  context: CollabServerTimingContext;
}): void {
  const stageMap = Object.fromEntries(
    input.stages.map((stage) => [stage.name, Number(formatDuration(stage.durationMs))]),
  );
  console.info(
    JSON.stringify({
      type: "collab_server_timing",
      route: input.operation,
      status: input.status,
      totalMs: Number(formatDuration(input.totalMs)),
      stages: stageMap,
      activity: input.context.activity ?? null,
      sessionId: input.context.sessionId ?? null,
      roomId: input.context.roomId ?? null,
      boardId: input.context.boardId ?? null,
      commandType: input.context.commandType ?? null,
      role: input.context.role ?? null,
      classId: input.context.classId ?? null,
    }),
  );
}

export async function withCollabServerTiming(
  operation: string,
  handler: (timer: CollabServerTimer) => Promise<Response>,
): Promise<Response> {
  const startedAt = performance.now();
  const stages: StageEntry[] = [];
  const context: CollabServerTimingContext = {};

  const timer: CollabServerTimer = {
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
      Object.assign(context, next);
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

export const __collabServerTimingTestUtils = {
  safeMetric,
  formatDuration,
  buildServerTimingHeader,
};
