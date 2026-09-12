import { describe, expect, it } from "vitest";
import {
  appDiagnosticBatchSchema,
  diagnosticIdentityForStorage,
  sanitizeDiagnosticMetadata,
  sanitizeDiagnosticRoute,
} from "@/lib/app-diagnostics/schema";

describe("central app diagnostics schema", () => {
  it("accepts a bounded authenticated event batch", () => {
    const result = appDiagnosticBatchSchema.safeParse({
      events: [{
        id: "event-12345678",
        sessionId: "session-1",
        deviceId: "device-1",
        at: Date.now(),
        surface: "student",
        phase: "activity",
        name: "activity_started",
        kind: "mark",
        activityId: "vocab-food-fruit",
      }],
    });
    expect(result.success).toBe(true);
  });

  it("removes query strings and sensitive metadata", () => {
    expect(sanitizeDiagnosticRoute("/login?next=/primary&secret=1234")).toBe("/login");
    expect(sanitizeDiagnosticMetadata({
      status: 500,
      password: "1234",
      error: "private stack detail",
      timeToHeadersMs: 400,
    })).toEqual({ status: 500, timeToHeadersMs: 400 });
  });

  it("removes parent invitation tokens and student identifiers from stored routes", () => {
    expect(sanitizeDiagnosticRoute("/parent/invitations/private-secret-token"))
      .toBe("/parent/invitations/:token");
    expect(sanitizeDiagnosticRoute("/parent/students/7c4d9b8f/progress?tab=latest"))
      .toBe("/parent/students/:studentId/progress");
  });

  it("removes authenticated identity from homework authentication failures", () => {
    expect(
      diagnosticIdentityForStorage(
        {
          surface: "student",
          phase: "homework_auth",
          name: "homework_auth_failed",
        },
        {
          userId: "student-auth-id",
          participantId: "student-auth-id",
          participantDisplayName: "Student Name",
        },
      ),
    ).toEqual({
      userId: null,
      participantId: null,
      participantDisplayName: null,
    });
  });

  it("removes authenticated identity from homework finalization telemetry", () => {
    expect(
      diagnosticIdentityForStorage(
        {
          surface: "student",
          phase: "homework_finalization",
          name: "duplicate_prevented",
        },
        {
          userId: "student-auth-id",
          participantId: "student-auth-id",
          participantDisplayName: "Student Name",
        },
      ),
    ).toEqual({
      userId: null,
      participantId: null,
      participantDisplayName: null,
    });
  });

  it("accepts the retryable homework-service code without sensitive detail", () => {
    const parsed = appDiagnosticBatchSchema.safeParse({
      events: [
        {
          id: "event-homework-service-1",
          sessionId: "session-1",
          deviceId: "device-1",
          at: Date.now(),
          surface: "student",
          phase: "homework_auth",
          name: "homework_auth_failed",
          kind: "error",
          homeworkId: "11111111-1111-4111-8111-111111111111",
          status: "retry",
          errorCode: "student_homework_service_unavailable",
          detail: {
            action: "save_writing",
            recovery: "retry",
          },
        },
      ],
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.events[0]?.errorCode).toBe(
        "student_homework_service_unavailable",
      );
      expect(sanitizeDiagnosticMetadata(parsed.data.events[0]?.detail)).toEqual({
        action: "save_writing",
        recovery: "retry",
      });
    }
  });

  it("keeps identity enrichment for unrelated authenticated diagnostics", () => {
    const identity = {
      userId: "teacher-auth-id",
      participantId: "teacher-auth-id",
      participantDisplayName: "Teacher Name",
    };
    expect(
      diagnosticIdentityForStorage(
        { surface: "teacher", phase: "navigation", name: "route_change" },
        identity,
      ),
    ).toEqual(identity);
  });
});
