import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const ROUTES = [
  "app/(student)/homework/[homeworkId]/page.tsx",
  "app/(student)/primary/homework/[homeworkId]/page.tsx",
  "app/(student)/secondary/homework/[homeworkId]/page.tsx",
] as const;

const RECOVERY_CLIENTS = [
  "components/assessment/AssessmentSpeakingRecorder.tsx",
  "components/homework/CreativePresentationMediaField.tsx",
  "components/homework/GradedTrackPlayer.tsx",
  "components/homework/HomeworkCollectionPlayer.tsx",
  "components/homework/HomeworkWritingPromptPlayer.tsx",
  "components/pilots/HomeworkTemplateOnePilot.tsx",
  "components/secondary/SecondaryHomeworkOneShell.tsx",
] as const;

describe("student homework recovery migration", () => {
  for (const route of ROUTES) {
    it(`${route} uses the shared recoverable route session`, () => {
      const contents = source(route);
      expect(contents).toContain("resolveStudentRouteSession");
      expect(contents).toContain("StudentSessionUnavailablePage");
      expect(contents).toContain("StudentHomeworkServiceUnavailablePage");
      expect(contents).toContain('detail.recovery === "retry"');
      expect(contents).not.toContain("supabase.auth.getUser(");
    });
  }

  for (const client of RECOVERY_CLIENTS) {
    it(`${client} renders the privacy-safe structured recovery notice`, () => {
      const contents = source(client);
      expect(contents).toContain("StudentActionFailureNotice");
      expect(contents).toContain("onRetry=");
      expect(contents).not.toContain("Student authentication required");
    });
  }

  it("diagnostics use an allowlisted payload without student work or identity", () => {
    const contents = source(
      "components/homework/StudentActionFailureNotice.tsx",
    );
    expect(contents).toContain('"homework_auth_failed"');
    expect(contents).toContain("{ action, recovery: failure.recovery }");
    expect(contents).toContain("route: window.location.pathname");
    expect(contents).not.toMatch(
      /failure\.(?:message|provider|email|token|answer|text|recording)/,
    );
  });

  it("diagnostic ingestion strips authenticated identity from homework failures", () => {
    const route = source("app/api/diagnostics/events/route.ts");
    const schema = source("lib/app-diagnostics/schema.ts");
    expect(route).toContain("diagnosticIdentityForStorage(event");
    expect(route).toContain("user_id: identity.userId");
    expect(route).toContain("participant_display_name: identity.participantDisplayName");
    expect(schema).toContain('event.phase === "homework_auth"');
    expect(schema).toContain('event.name === "homework_auth_failed"');
  });

  it("tells writing students that their local draft remains available after sign-in loss", () => {
    const notice = source("components/homework/StudentActionFailureNotice.tsx");
    const writing = source("components/homework/HomeworkWritingPromptPlayer.tsx");
    expect(notice).toContain("{retainedWorkMessage ? (");
    expect(notice).toContain('failure.recovery === "retry" && onRetry');
    expect(notice).not.toContain('failure.recovery === "retry" && retainedWorkMessage');
    expect(writing).toContain('retainedWorkMessage="Your writing is still kept on this device."');
  });

  it("lets a wrong-role account reach the requested student sign-in portal", () => {
    const classifier = source("lib/auth/student-action-auth.ts");
    const notice = source("components/homework/StudentActionFailureNotice.tsx");
    const login = source("app/login/page.tsx");

    expect(classifier).toContain("recoveryPath: studentSignInRecoveryPath(input.nextPath)");
    expect(notice).toContain('href={failure.recoveryPath ?? "/login?portal=student"}');
    expect(login).toContain("shouldAutoRedirectFromLogin");
    expect(login).toContain("requestedPortal");
  });

  it("protected homework data reads can reuse the verified route session", () => {
    const files = [
      "lib/data/class-homework.ts",
      "lib/data/homework-writing-submissions.ts",
      "lib/data/homework-collection-attempts.ts",
      "lib/data/homework-collection-speaking-recordings.ts",
      "lib/data/homework-template-submissions.ts",
      "lib/data/assessment-attempts.ts",
    ];
    for (const file of files) {
      const contents = source(file);
      expect(contents).toContain("verifiedSession");
      expect(contents).toContain("resolveStudentActionSession");
    }
  });

  it("Primary assessment reads reuse the route's already verified student session", () => {
    const route = source("app/(student)/primary/homework/[homeworkId]/page.tsx");
    expect(route).toContain("getMyAssessmentAttempt(homework.id, session)");
    expect(route).toContain("getMyAssessmentSpeakingRecordings(homework.id, session)");
    expect(route).toContain("getMyAssessmentSpeakingReview(homework.id, session)");
  });
});
