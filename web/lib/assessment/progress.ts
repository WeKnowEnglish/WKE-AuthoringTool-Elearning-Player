import { scoreClozeChoicePlayable, listClozeChoiceGaps } from "@/lib/cloze-choice";
import { scoreClozeOpenPlayable, listClozeOpenGaps } from "@/lib/cloze-open";
import { scoreDefinitionMatchPlayable } from "@/lib/definition-match";
import { scoreReadAndAnswerPlayable } from "@/lib/read-and-answer";
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
  if (part.kind === "definition_match") {
    return part.activity.pairs.map((pair) => pair.id);
  }
  if (part.kind === "read_and_answer") {
    return part.activity.questions.map((question) => question.id);
  }
  if (part.kind === "short_answer_reading") {
    return part.activity.questions.map((question) => question.id);
  }
  if (part.kind === "picture_yes_no") {
    return part.activity.statements.map((statement) => statement.id);
  }
  if (part.kind === "dialogue_bank") {
    return part.activity.exchanges.map((exchange) => exchange.id);
  }
  if (part.kind === "story_bank_title") {
    return [
      ...part.activity.segments
        .filter((segment) => segment.type === "gap")
        .map((segment) => segment.id),
      part.activity.titleQuestionId,
    ];
  }
  if (part.kind === "listening_character_match") {
    return part.activity.characters.map((character) => character.id);
  }
  if (part.kind === "listening_information") {
    return part.activity.fields.map((field) => field.id);
  }
  if (part.kind === "listening_item_match") {
    return part.activity.prompts.map((prompt) => prompt.id);
  }
  if (part.kind === "listening_picture_choice") {
    return part.activity.items.map((item) => item.id);
  }
  if (part.kind === "listening_colour_picture") {
    return part.activity.targets.map((target) => target.id);
  }
  if (
    part.kind === "speaking_picture_differences" ||
    part.kind === "speaking_question_exchange" ||
    part.kind === "speaking_picture_story"
  ) {
    return [part.activity.responseId];
  }
  if (part.kind === "cloze_choice") {
    return listClozeChoiceGaps(part.activity.segments).map((gap) => gap.id);
  }
  return listClozeOpenGaps(part.activity.segments).map((gap) => gap.id);
}

export function scoreAssessmentPart(
  part: AssessmentPart,
  responses: Record<string, string> = {},
): AssessmentPartProgress {
  const ids = assessmentPartItemIds(part);
  const answered = ids.filter((id) => Boolean((responses[id] ?? "").trim())).length;
  if (
    part.kind === "speaking_picture_differences" ||
    part.kind === "speaking_question_exchange" ||
    part.kind === "speaking_picture_story"
  ) {
    return { answered, total: 1, correct: 0, objectiveTotal: 0 };
  }
  let score: { correct: number; total: number };
  if (part.kind === "definition_match") {
    score = scoreDefinitionMatchPlayable(part.activity, responses);
  } else if (part.kind === "read_and_answer") {
    score = scoreReadAndAnswerPlayable(part.activity, responses);
  } else if (part.kind === "short_answer_reading") {
    const correct = part.activity.questions.filter((question) => {
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
    score = { correct, total: part.activity.questions.length };
  } else if (part.kind === "picture_yes_no") {
    score = {
      correct: part.activity.statements.filter(
        (statement) => responses[statement.id] === statement.correctAnswer,
      ).length,
      total: part.activity.statements.length,
    };
  } else if (part.kind === "dialogue_bank") {
    score = {
      correct: part.activity.exchanges.filter(
        (exchange) => responses[exchange.id] === exchange.correctResponseId,
      ).length,
      total: part.activity.exchanges.length,
    };
  } else if (part.kind === "story_bank_title") {
    const gaps = part.activity.segments.filter((segment) => segment.type === "gap");
    score = {
      correct:
        gaps.filter((gap) => responses[gap.id] === gap.correctWordId).length +
        (responses[part.activity.titleQuestionId] === part.activity.correctTitleId ? 1 : 0),
      total: gaps.length + 1,
    };
  } else if (part.kind === "listening_character_match") {
    score = {
      correct: part.activity.characters.filter(
        (character) => responses[character.id] === character.correctNameId,
      ).length,
      total: part.activity.characters.length,
    };
  } else if (part.kind === "listening_information") {
    const normalize = (value: string) => value.trim().replace(/[.,!?;:'"()[\]{}]/g, "").replace(/\s+/g, " ").toLocaleLowerCase();
    score = {
      correct: part.activity.fields.filter((field) => {
        const answer = normalize(responses[field.id] ?? "");
        return field.acceptedAnswers.some((accepted) => normalize(accepted) === answer);
      }).length,
      total: part.activity.fields.length,
    };
  } else if (part.kind === "listening_item_match") {
    score = {
      correct: part.activity.prompts.filter(
        (prompt) => responses[prompt.id] === prompt.correctChoiceId,
      ).length,
      total: part.activity.prompts.length,
    };
  } else if (part.kind === "listening_picture_choice") {
    score = {
      correct: part.activity.items.filter((item) => responses[item.id] === item.correctChoiceId).length,
      total: part.activity.items.length,
    };
  } else if (part.kind === "listening_colour_picture") {
    score = {
      correct: part.activity.targets.filter(
        (target) => responses[target.id] === target.correctColourId,
      ).length,
      total: part.activity.targets.length,
    };
  } else if (part.kind === "cloze_choice") {
    score = scoreClozeChoicePlayable(part.activity, responses);
  } else {
    score = scoreClozeOpenPlayable(part.activity, responses);
  }
  return { answered, total: score.total, correct: score.correct, objectiveTotal: score.total };
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
    for (const [itemId, value] of Object.entries(partRaw as Record<string, unknown>)) {
      if (allowed.has(itemId) && typeof value === "string") {
        answers[itemId] = value.slice(0, 240);
      }
    }
    if (Object.keys(answers).length > 0) result[part.id] = answers;
  }
  return result;
}
