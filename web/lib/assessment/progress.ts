import { scoreClozeChoicePlayable, listClozeChoiceGaps } from "@/lib/cloze-choice";
import { scoreClozeOpenPlayable, listClozeOpenGaps } from "@/lib/cloze-open";
import { scoreDefinitionMatchPlayable } from "@/lib/definition-match";
import { scoreReadAndAnswerPlayable } from "@/lib/read-and-answer";
import { normalizeAssessmentPart } from "@/lib/assessment/normalize-definition";
import type {
  AssessmentDefinition,
  AssessmentPart,
  AssessmentPartProgress,
  AssessmentProgress,
} from "@/lib/assessment/types";

export function listAssessmentParts(definition: AssessmentDefinition): AssessmentPart[] {
  return definition.sections.flatMap((section) => section.parts);
}

export function assessmentPartItemIds(part: AssessmentPart): string[] {
  const normalized = normalizeAssessmentPart(part);
  if (normalized.kind === "definition_match") {
    return normalized.activity.pairs.map((pair) => pair.id);
  }
  if (normalized.kind === "read_and_answer") {
    return normalized.activity.questions.map((question) => question.id);
  }
  if (normalized.kind === "short_answer_reading") {
    return normalized.activity.questions.map((question) => question.id);
  }
  if (normalized.kind === "picture_yes_no") {
    return normalized.activity.statements.map((statement) => statement.id);
  }
  if (normalized.kind === "dialogue_bank") {
    return normalized.activity.exchanges.map((exchange) => exchange.id);
  }
  if (normalized.kind === "story_bank_title") {
    return [
      ...normalized.activity.segments
        .filter((segment) => segment.type === "gap")
        .map((segment) => segment.id),
      normalized.activity.titleQuestionId,
    ];
  }
  if (normalized.kind === "listening_character_match") {
    return normalized.activity.targets.map((target) => target.id);
  }
  if (normalized.kind === "listening_information") {
    return normalized.activity.fields.map((field) => field.id);
  }
  if (normalized.kind === "listening_item_match") {
    return normalized.activity.prompts.map((prompt) => prompt.id);
  }
  if (normalized.kind === "listening_picture_choice") {
    return normalized.activity.items.map((item) => item.id);
  }
  if (normalized.kind === "listening_colour_picture") {
    return normalized.activity.targets.map((target) => target.id);
  }
  if (
    normalized.kind === "speaking_picture_differences" ||
    normalized.kind === "speaking_question_exchange" ||
    normalized.kind === "speaking_picture_story"
  ) {
    return [normalized.activity.responseId];
  }
  if (normalized.kind === "cloze_choice") {
    return listClozeChoiceGaps(normalized.activity.segments).map((gap) => gap.id);
  }
  return listClozeOpenGaps(normalized.activity.segments).map((gap) => gap.id);
}

export function scoreAssessmentPart(
  part: AssessmentPart,
  responses: Record<string, string> = {},
): AssessmentPartProgress {
  const normalized = normalizeAssessmentPart(part);
  const ids = assessmentPartItemIds(normalized);
  const answered = ids.filter((id) => Boolean((responses[id] ?? "").trim())).length;
  if (
    normalized.kind === "speaking_picture_differences" ||
    normalized.kind === "speaking_question_exchange" ||
    normalized.kind === "speaking_picture_story"
  ) {
    return { answered, total: 1, correct: 0, objectiveTotal: 0 };
  }
  let score: { correct: number; total: number };
  if (normalized.kind === "definition_match") {
    score = scoreDefinitionMatchPlayable(normalized.activity, responses);
  } else if (normalized.kind === "read_and_answer") {
    score = scoreReadAndAnswerPlayable(normalized.activity, responses);
  } else if (normalized.kind === "short_answer_reading") {
    const correct = normalized.activity.questions.filter((question) => {
      const answer = (responses[question.id] ?? "")
        .trim()
        .replace(/[.,!?;:'"()[\]{}]/g, "")
        .replace(/\s+/g, " ")
        .toLocaleLowerCase();
      return question.acceptedAnswers.some(
        (accepted) =>
          accepted
            .trim()
            .replace(/[.,!?;:'"()[\]{}]/g, "")
            .replace(/\s+/g, " ")
            .toLocaleLowerCase() === answer,
      );
    }).length;
    score = { correct, total: normalized.activity.questions.length };
  } else if (normalized.kind === "picture_yes_no") {
    score = {
      correct: normalized.activity.statements.filter(
        (statement) => responses[statement.id] === statement.correctAnswer,
      ).length,
      total: normalized.activity.statements.length,
    };
  } else if (normalized.kind === "dialogue_bank") {
    score = {
      correct: normalized.activity.exchanges.filter(
        (exchange) => responses[exchange.id] === exchange.correctResponseId,
      ).length,
      total: normalized.activity.exchanges.length,
    };
  } else if (normalized.kind === "story_bank_title") {
    const gaps = normalized.activity.segments.filter(
      (segment) => segment.type === "gap",
    );
    score = {
      correct:
        gaps.filter((gap) => responses[gap.id] === gap.correctWordId).length +
        (responses[normalized.activity.titleQuestionId] ===
        normalized.activity.correctTitleId
          ? 1
          : 0),
      total: gaps.length + 1,
    };
  } else if (normalized.kind === "listening_character_match") {
    score = {
      correct: normalized.activity.targets.filter(
        (target) => responses[target.id] === target.correctNameId,
      ).length,
      total: normalized.activity.targets.length,
    };
  } else if (normalized.kind === "listening_information") {
    const normalizeAnswer = (value: string) =>
      value
        .trim()
        .replace(/[.,!?;:'"()[\]{}]/g, "")
        .replace(/\s+/g, " ")
        .toLocaleLowerCase();
    score = {
      correct: normalized.activity.fields.filter((field) => {
        const answer = normalizeAnswer(responses[field.id] ?? "");
        return field.acceptedAnswers.some(
          (accepted) => normalizeAnswer(accepted) === answer,
        );
      }).length,
      total: normalized.activity.fields.length,
    };
  } else if (normalized.kind === "listening_item_match") {
    score = {
      correct: normalized.activity.prompts.filter(
        (prompt) => responses[prompt.id] === prompt.correctChoiceId,
      ).length,
      total: normalized.activity.prompts.length,
    };
  } else if (normalized.kind === "listening_picture_choice") {
    score = {
      correct: normalized.activity.items.filter(
        (item) => responses[item.id] === item.correctChoiceId,
      ).length,
      total: normalized.activity.items.length,
    };
  } else if (normalized.kind === "listening_colour_picture") {
    score = {
      correct: normalized.activity.targets.filter(
        (target) => responses[target.id] === target.correctColourId,
      ).length,
      total: normalized.activity.targets.length,
    };
  } else if (normalized.kind === "cloze_choice") {
    score = scoreClozeChoicePlayable(normalized.activity, responses);
  } else {
    score = scoreClozeOpenPlayable(normalized.activity, responses);
  }
  return {
    answered,
    total: score.total,
    correct: score.correct,
    objectiveTotal: score.total,
  };
}

export function assessmentProgress(
  definition: AssessmentDefinition,
  responses: Record<string, Record<string, string>>,
): AssessmentProgress {
  const parts: Record<string, AssessmentPartProgress> = {};
  let answered = 0;
  let total = 0;
  let correct = 0;
  let objectiveTotal = 0;
  for (const part of listAssessmentParts(definition)) {
    const progress = scoreAssessmentPart(part, responses[part.id]);
    parts[part.id] = progress;
    answered += progress.answered;
    total += progress.total;
    correct += progress.correct;
    objectiveTotal += progress.objectiveTotal;
  }
  return { answered, total, correct, objectiveTotal, parts };
}

export function assessmentAttemptStorageKey(definition: AssessmentDefinition): string {
  return `wke-assessment:${definition.id}:${definition.contentVersion}`;
}

/** Keep only known item ids and bounded string answers before persistence/scoring. */
export function sanitizeAssessmentResponses(
  definition: AssessmentDefinition,
  raw: unknown,
): Record<string, Record<string, string>> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const input = raw as Record<string, unknown>;
  const result: Record<string, Record<string, string>> = {};
  for (const part of listAssessmentParts(definition)) {
    const partRaw = input[part.id];
    if (!partRaw || typeof partRaw !== "object" || Array.isArray(partRaw)) continue;
    const allowed = new Set(assessmentPartItemIds(part));
    const answers: Record<string, string> = {};
    for (const [itemId, value] of Object.entries(
      partRaw as Record<string, unknown>,
    )) {
      if (allowed.has(itemId) && typeof value === "string") {
        answers[itemId] = value.slice(0, 240);
      }
    }
    if (Object.keys(answers).length > 0) result[part.id] = answers;
  }
  return result;
}
