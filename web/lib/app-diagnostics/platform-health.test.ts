import { describe, expect, it } from "vitest";
import {
  buildPlatformHealthSnapshot,
  classifyPlatformHealthJourney,
  diagnosticIssueFingerprint,
  normalizeDiagnosticRoutePattern,
  type PlatformHealthEvent,
} from "@/lib/app-diagnostics/platform-health";

const NOW = new Date("2026-09-15T12:00:00.000Z");

function event(
  overrides: Partial<PlatformHealthEvent> = {},
): PlatformHealthEvent {
  return {
    occurredAt: "2026-09-15T11:00:00.000Z",
    userLabel: "Student 1",
    sessionId: "session-1",
    surface: "student",
    phase: "authentication",
    name: "login_failed",
    kind: "error",
    route: "/login?next=/primary&token=secret",
    status: "failed",
    errorCode: "invalid_credentials",
    appVersion: "release-a",
    deviceCategory: "mobile",
    ...overrides,
  };
}

describe("platform health aggregation", () => {
  it("groups five repeated failures into one privacy-safe issue", () => {
    const events = Array.from({ length: 5 }, (_, index) => event({
      sessionId: `session-${index}`,
      userLabel: `Student ${index}`,
      occurredAt: `2026-09-15T11:0${index}:00.000Z`,
    }));
    const snapshot = buildPlatformHealthSnapshot(events, { now: NOW, windowHours: 24 });

    expect(snapshot.issueGroups).toHaveLength(1);
    expect(snapshot.issueGroups[0]).toMatchObject({
      count: 5,
      affectedSessions: 5,
      affectedUsers: 5,
      journey: "authentication",
      latestRelease: "release-a",
      routePattern: "/login",
    });
    expect(snapshot.issueGroups[0]?.devices).toEqual([{ name: "mobile", count: 5 }]);
  });

  it("keeps safe error codes and normalized route patterns distinct", () => {
    const first = event({ errorCode: "invalid_credentials", route: "/login?answer=private" });
    const second = event({ errorCode: "auth_connection_failed", route: "/login?password=private" });
    const third = event({
      errorCode: "activity_load_failed",
      surface: "lesson",
      phase: "chunk",
      name: "lesson_chunk_failed",
      route: "/learn/12345?student=private",
    });

    expect(diagnosticIssueFingerprint(first)).not.toBe(diagnosticIssueFingerprint(second));
    expect(diagnosticIssueFingerprint(first)).not.toContain("private");
    expect(normalizeDiagnosticRoutePattern(third.route)).toBe("/learn/:id");
    expect(buildPlatformHealthSnapshot([first, second, third], { now: NOW }).issueGroups)
      .toHaveLength(3);
  });

  it("reports deterministic status for all four learning journeys", () => {
    const events: PlatformHealthEvent[] = [
      event({ name: "login_succeeded", kind: "mark", status: "succeeded" }),
      event({ phase: "homework_finalization", name: "submit_succeeded", kind: "mark", homeworkId: "homework-1", route: "/homework/homework-1", status: "succeeded" }),
      event({ phase: "homework_finalization", name: "submit_failed", homeworkId: "homework-2", route: "/homework/homework-2", errorCode: "homework_finalization_failed" }),
      event({ surface: "lesson", phase: "chunk", name: "VocabularyView", kind: "span", route: "/learn/vocabulary", status: null }),
      ...Array.from({ length: 3 }, (_, index) => event({
        surface: "student",
        phase: "virtual-classroom",
        name: "classroom_reconnect_failed",
        classroomSessionId: "vcs-demo",
        sessionId: `classroom-session-${index}`,
        route: "/virtual-classroom/vcs-demo",
        errorCode: "classroom_reconnect_timeout",
      })),
    ];
    const snapshot = buildPlatformHealthSnapshot(events, { now: NOW });
    const statuses = Object.fromEntries(snapshot.journeys.map((journey) => [journey.id, journey.status]));

    expect(statuses).toEqual({
      authentication: "healthy",
      homework: "degraded",
      "activity-loading": "healthy",
      "live-classroom": "failing",
    });
  });

  it("treats a non-successful HTTP span as a failure", () => {
    const failedRestore = event({
      surface: "student",
      phase: "virtual-classroom",
      name: "classroom_runtime_restore",
      kind: "span",
      route: "/virtual-classroom/vcs-demo",
      classroomSessionId: "vcs-demo",
      status: null,
      errorCode: null,
      metadata: { ok: false, status: 503 },
    });
    const snapshot = buildPlatformHealthSnapshot([failedRestore], { now: NOW });

    expect(snapshot.journeys[3]?.status).toBe("degraded");
    expect(snapshot.issueGroups[0]?.errorCode).toBe("http_503");
  });

  it("suppresses low-volume affected-user counts", () => {
    const snapshot = buildPlatformHealthSnapshot([
      event({ userLabel: "Student 1", sessionId: "session-1" }),
      event({ userLabel: "Student 2", sessionId: "session-2" }),
    ], { now: NOW });

    expect(snapshot.issueGroups[0]).toMatchObject({
      affectedUsers: null,
      affectedUsersSuppressed: true,
      affectedSessions: 2,
    });
  });

  it("classifies reconnect outcomes without reading classroom content", () => {
    const reconnect = event({
      surface: "student",
      phase: "virtual-classroom",
      name: "classroom_reconnect_recovered",
      kind: "span",
      classroomSessionId: "vcs-demo",
      route: "/virtual-classroom/vcs_demo",
      status: "recovered",
      errorCode: null,
    });

    expect(classifyPlatformHealthJourney(reconnect)).toBe("live-classroom");
    expect(buildPlatformHealthSnapshot([reconnect], { now: NOW }).journeys[3]).toMatchObject({
      id: "live-classroom",
      status: "healthy",
      successes: 1,
    });
  });
});
