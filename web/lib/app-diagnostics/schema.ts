import { z } from "zod";

const timingEntrySchema = z.object({
  name: z.string().max(80),
  durationMs: z.number().finite().min(0).max(600_000),
});

const detailValueSchema = z.union([
  z.string().max(500),
  z.number().finite(),
  z.boolean(),
  z.null(),
  z.array(timingEntrySchema).max(30),
]);

export const appDiagnosticEventSchema = z.object({
  id: z.string().min(8).max(160),
  sessionId: z.string().min(3).max(160),
  deviceId: z.string().min(3).max(160),
  at: z.number().int().min(1),
  surface: z.enum(["student", "teacher", "lesson", "live-game", "parent", "admin"]),
  phase: z.string().min(1).max(80),
  name: z.string().min(1).max(120),
  kind: z.enum(["mark", "span", "error", "vital"]),
  durationMs: z.number().finite().min(0).max(600_000).optional(),
  route: z.string().max(500).optional(),
  detail: z.record(z.string().max(80), detailValueSchema).optional(),
  classId: z.string().uuid().optional(),
  classroomSessionId: z.string().min(3).max(160).optional(),
  activityId: z.string().max(160).optional(),
  homeworkId: z.string().uuid().optional(),
  status: z.string().max(40).optional(),
  errorCode: z.string().max(120).optional(),
  appVersion: z.string().max(120).optional(),
  deviceCategory: z.enum(["mobile", "tablet", "desktop", "unknown"]).optional(),
});

export const appDiagnosticBatchSchema = z.object({
  events: z.array(appDiagnosticEventSchema).min(1).max(50),
});

export type ValidatedAppDiagnosticEvent = z.infer<typeof appDiagnosticEventSchema>;

export function sanitizeDiagnosticRoute(route: string | undefined): string | null {
  if (!route) return null;
  const [pathname] = route.split("?");
  if (!pathname) return null;
  return pathname
    .replace(/^\/parent\/invitations\/[^/]+/, "/parent/invitations/:token")
    .replace(/^\/parent\/students\/[^/]+/, "/parent/students/:studentId")
    .slice(0, 500);
}

const BLOCKED_METADATA_KEY = /(password|secret|token|email|answer|response|error|stack|content|text)/i;

export function sanitizeDiagnosticMetadata(
  detail: ValidatedAppDiagnosticEvent["detail"],
): Record<string, unknown> {
  if (!detail) return {};
  return Object.fromEntries(
    Object.entries(detail).filter(([key]) => !BLOCKED_METADATA_KEY.test(key)),
  );
}
