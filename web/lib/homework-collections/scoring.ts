import {
  HOMEWORK_COLLECTION_VERSION,
  type HomeworkCollectionAttemptContent,
  type HomeworkCollectionDocument,
  type HomeworkCollectionPart,
  type HomeworkCollectionPartResponse,
  type HomeworkCollectionScoredPart,
} from "@/lib/homework-collections/types";
import {
  homeworkCollectionGradingMode,
  homeworkCollectionPartItemCount,
  homeworkCollectionPartMaxScore,
} from "@/lib/homework-collections/document";

function normalizeAnswer(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 10_000) : "";
}

function comparable(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^\p{L}\p{N}' ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function allowedAnswerIds(part: HomeworkCollectionPart): Set<string> {
  if (part.kind === "multiple_choice") {
    return new Set(part.questions.map((question) => question.id));
  }
  if (part.kind === "line_match") return new Set(part.pairs.map((pair) => pair.id));
  if (part.kind === "free_response") return new Set(part.prompts.map((prompt) => prompt.id));
  if (part.kind === "listening_item_match") {
    return new Set(part.activity.prompts.map((prompt) => prompt.id));
  }
  return new Set(part.items.map((item) => item.id));
}

export function normalizeHomeworkCollectionPartResponse(
  part: HomeworkCollectionPart,
  raw: unknown,
): HomeworkCollectionPartResponse {
  const row = raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
  const source = row.answers && typeof row.answers === "object" && !Array.isArray(row.answers)
    ? (row.answers as Record<string, unknown>)
    : row;
  const allowed = allowedAnswerIds(part);
  const answers = Object.fromEntries(
    Object.entries(source)
      .filter(([id]) => allowed.has(id))
      .map(([id, answer]) => [id, normalizeAnswer(answer)])
      .filter(([, answer]) => Boolean(answer)),
  );
  return { partId: part.id, answers };
}

export function scoreHomeworkCollectionPart(
  part: HomeworkCollectionPart,
  rawResponse: unknown,
): HomeworkCollectionScoredPart {
  const response = normalizeHomeworkCollectionPartResponse(part, rawResponse);
  const answers = response.answers;
  let correct: number | null = 0;

  if (part.kind === "multiple_choice") {
    correct = part.questions.reduce(
      (total, question) => total + (answers[question.id] === question.correctOptionId ? 1 : 0),
      0,
    );
  } else if (part.kind === "letter_mixup") {
    correct = part.items.reduce((total, item) => {
      const accepted = [item.targetWord, ...item.acceptedWords].map(comparable);
      return total + (accepted.includes(comparable(answers[item.id] ?? "")) ? 1 : 0);
    }, 0);
  } else if (part.kind === "line_match") {
    correct = part.pairs.reduce(
      (total, pair) => total + (answers[pair.id] === pair.id ? 1 : 0),
      0,
    );
  } else if (part.kind === "listen_and_choose") {
    correct = part.items.reduce(
      (total, item) => total + (answers[item.id] === item.correctChoiceId ? 1 : 0),
      0,
    );
  } else if (part.kind === "listening_item_match") {
    correct = part.activity.prompts.reduce(
      (total, prompt) =>
        total + (answers[prompt.id] === prompt.correctChoiceId ? 1 : 0),
      0,
    );
  } else if (part.kind === "sentence_scramble") {
    correct = part.items.reduce(
      (total, item) => total + (comparable(answers[item.id] ?? "") === comparable(item.sentence) ? 1 : 0),
      0,
    );
  } else {
    correct = null;
  }

  return {
    partId: part.id,
    kind: part.kind,
    gradingMode: homeworkCollectionGradingMode(part.kind),
    answers,
    correct,
    maxScore: homeworkCollectionPartMaxScore(part),
    answered: Object.keys(answers).length,
    itemCount: homeworkCollectionPartItemCount(part),
  };
}

export function scoreHomeworkCollectionAttempt(
  document: HomeworkCollectionDocument,
  rawResponses: unknown,
): HomeworkCollectionAttemptContent {
  const source = rawResponses && typeof rawResponses === "object" && !Array.isArray(rawResponses)
    ? (rawResponses as Record<string, unknown>)
    : {};
  return {
    version: HOMEWORK_COLLECTION_VERSION,
    parts: Object.fromEntries(
      document.parts.map((part) => [part.id, scoreHomeworkCollectionPart(part, source[part.id])]),
    ),
  };
}

export function homeworkCollectionAttemptTotals(content: HomeworkCollectionAttemptContent) {
  return Object.values(content.parts).reduce(
    (totals, part) => {
      if (part.correct === null) {
        totals.manualMaxScore += part.maxScore;
      } else {
        totals.autoScore += part.correct;
        totals.autoMaxScore += part.maxScore;
      }
      totals.answered += part.answered;
      totals.itemCount += part.itemCount;
      return totals;
    },
    { autoScore: 0, autoMaxScore: 0, manualMaxScore: 0, answered: 0, itemCount: 0 },
  );
}

export function homeworkCollectionRequiredPartsComplete(
  document: HomeworkCollectionDocument,
  content: HomeworkCollectionAttemptContent,
): boolean {
  return document.parts.every((part) => {
    if (!part.required) return true;
    const scored = content.parts[part.id];
    if (!scored || scored.answered < scored.itemCount) return false;
    if (part.kind === "free_response") {
      return part.prompts.every((prompt) => {
        const answer = scored.answers[prompt.id] ?? "";
        const words = answer.trim() ? answer.trim().split(/\s+/).length : 0;
        return words >= prompt.minWords;
      });
    }
    return true;
  });
}
