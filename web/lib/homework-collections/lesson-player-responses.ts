import {
  scoreHomeworkCollectionAttempt,
} from "@/lib/homework-collections/scoring";
import type {
  HomeworkCollectionAttemptContent,
  HomeworkCollectionDocument,
  HomeworkCollectionPart,
} from "@/lib/homework-collections/types";
import type {
  GradedActivityResponse,
  GradedActivityRunResult,
} from "@/lib/graded-activities/types";

export type HomeworkCollectionLessonPlayerResponses = Record<
  string,
  { answers: Record<string, string> }
>;

function itemIds(part: HomeworkCollectionPart): Set<string> {
  if (part.kind === "multiple_choice") {
    return new Set(part.questions.map((question) => question.id));
  }
  if (part.kind === "line_match") return new Set(part.pairs.map((pair) => pair.id));
  if (part.kind === "free_response") {
    return new Set(part.prompts.map((prompt) => prompt.id));
  }
  return new Set(part.items.map((item) => item.id));
}

function responseText(response: GradedActivityResponse): string | null {
  if (typeof response === "string") return response;
  if (typeof response === "number" || typeof response === "boolean") {
    return String(response);
  }
  return null;
}

/**
 * Convert a Lesson Player run to the existing server-scored collection shape.
 * The first response is intentionally retained so required retries cannot turn
 * an initially incorrect graded answer into full first-attempt credit.
 */
export function homeworkCollectionResponsesFromLessonPlayerRun(
  document: HomeworkCollectionDocument,
  run: GradedActivityRunResult,
): HomeworkCollectionLessonPlayerResponses {
  const parts = new Map(document.parts.map((part) => [part.id, part]));
  const allowedItems = new Map(
    document.parts.map((part) => [part.id, itemIds(part)]),
  );
  const responses: HomeworkCollectionLessonPlayerResponses = {};

  for (const event of run.attempts) {
    const part = parts.get(event.partId);
    if (!part || !allowedItems.get(part.id)?.has(event.itemId)) continue;
    const answer = responseText(event.response);
    if (answer === null) continue;
    const partResponses = responses[part.id] ?? { answers: {} };
    if (partResponses.answers[event.itemId] !== undefined) continue;
    partResponses.answers[event.itemId] = answer;
    responses[part.id] = partResponses;
  }

  return responses;
}

/** Recompute correctness from frozen answers; event pass flags are not trusted. */
export function scoreHomeworkCollectionLessonPlayerRun(
  document: HomeworkCollectionDocument,
  run: GradedActivityRunResult,
): HomeworkCollectionAttemptContent {
  return scoreHomeworkCollectionAttempt(
    document,
    homeworkCollectionResponsesFromLessonPlayerRun(document, run),
  );
}
