import { readStudentPracticeSessionEvents } from "@/lib/student-session";

/** Slugs with at least one completed grammar_poster session in local event log. */
export function readCompletedGrammarPosterSlugs(): Set<string> {
  const events = readStudentPracticeSessionEvents();
  const startedBySession = new Map<string, { activityId: string; activityKind: string }>();
  const completed = new Set<string>();

  for (const event of events) {
    if (event.type === "session_started") {
      startedBySession.set(event.sessionId, {
        activityId: event.activityId,
        activityKind: event.activityKind,
      });
    }
    if (event.type === "session_completed" && event.result === "completed") {
      const started = startedBySession.get(event.sessionId);
      if (started?.activityKind === "grammar_poster") {
        completed.add(started.activityId);
      }
    }
  }

  return completed;
}

export function isGrammarPosterCompleted(slug: string): boolean {
  return readCompletedGrammarPosterSlugs().has(slug);
}
