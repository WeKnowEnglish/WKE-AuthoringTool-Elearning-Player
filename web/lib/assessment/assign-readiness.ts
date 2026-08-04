import { listClozeChoiceGaps } from "@/lib/cloze-choice";
import { listClozeOpenGaps } from "@/lib/cloze-open";
import { normalizeAssessmentPart } from "@/lib/assessment/normalize-definition";
import type {
  AssessmentDefinition,
  AssessmentPart,
} from "@/lib/assessment/types";

export type AssessmentAssignIssue = {
  partId: string;
  partTitle: string;
  message: string;
};

function issue(
  part: AssessmentPart,
  message: string,
): AssessmentAssignIssue {
  return {
    partId: part.id,
    partTitle: part.title,
    message,
  };
}

function hasMediaUrl(value: string | undefined | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function collectPartIssues(part: AssessmentPart): AssessmentAssignIssue[] {
  const normalized = normalizeAssessmentPart(part);
  const out: AssessmentAssignIssue[] = [];

  if (normalized.kind === "picture_yes_no") {
    if (!hasMediaUrl(normalized.activity.image.src)) {
      out.push(issue(normalized, "Picture URL is empty."));
    }
  } else if (normalized.kind === "listening_character_match") {
    if (!hasMediaUrl(normalized.activity.image.src)) {
      out.push(issue(normalized, "Scene picture URL is empty."));
    }
    const nameIds = new Set(normalized.activity.names.map((name) => name.id));
    if (normalized.activity.targets.length === 0) {
      out.push(issue(normalized, "Add at least one person hitbox."));
    }
    for (const target of normalized.activity.targets) {
      if (!target.correctNameId || !nameIds.has(target.correctNameId)) {
        out.push(
          issue(
            normalized,
            `Hitbox “${target.label || target.id}” has no valid correct name.`,
          ),
        );
      }
    }
  } else if (normalized.kind === "listening_colour_picture") {
    if (!hasMediaUrl(normalized.activity.image.src)) {
      out.push(issue(normalized, "Scene picture URL is empty."));
    }
    const colourIds = new Set(
      normalized.activity.palette.map((colour) => colour.id),
    );
    for (const target of normalized.activity.targets) {
      if (!target.correctColourId || !colourIds.has(target.correctColourId)) {
        out.push(
          issue(
            normalized,
            `Target “${target.label || target.id}” has no valid correct colour.`,
          ),
        );
      }
    }
  } else if (normalized.kind === "listening_item_match") {
    const choiceIds = new Set(
      normalized.activity.choices.map((choice) => choice.id),
    );
    for (const prompt of normalized.activity.prompts) {
      if (!prompt.correctChoiceId || !choiceIds.has(prompt.correctChoiceId)) {
        out.push(
          issue(
            normalized,
            `Prompt “${prompt.label || prompt.id}” has no valid correct choice.`,
          ),
        );
      }
    }
  } else if (normalized.kind === "listening_picture_choice") {
    for (const item of normalized.activity.items) {
      const choiceIds = new Set(item.choices.map((choice) => choice.id));
      if (!item.correctChoiceId || !choiceIds.has(item.correctChoiceId)) {
        out.push(
          issue(normalized, `Item “${item.id}” has no valid correct picture.`),
        );
      }
      for (const choice of item.choices) {
        if (!hasMediaUrl(choice.imageSrc)) {
          out.push(
            issue(
              normalized,
              `Picture choice “${choice.label || choice.id}” has an empty image.`,
            ),
          );
        }
      }
    }
  } else if (normalized.kind === "dialogue_bank") {
    const responseIds = new Set(
      normalized.activity.responses.map((response) => response.id),
    );
    for (const exchange of normalized.activity.exchanges) {
      if (
        !exchange.correctResponseId ||
        !responseIds.has(exchange.correctResponseId)
      ) {
        out.push(
          issue(
            normalized,
            `Exchange “${exchange.speaker || exchange.id}” has no valid correct response.`,
          ),
        );
      }
    }
  } else if (normalized.kind === "story_bank_title") {
    const wordIds = new Set(normalized.activity.words.map((word) => word.id));
    const titleIds = new Set(
      normalized.activity.titleOptions.map((option) => option.id),
    );
    for (const segment of normalized.activity.segments) {
      if (segment.type !== "gap") continue;
      if (!segment.correctWordId || !wordIds.has(segment.correctWordId)) {
        out.push(
          issue(
            normalized,
            `Story gap “${segment.id}” has no valid correct word.`,
          ),
        );
      }
    }
    if (
      !normalized.activity.correctTitleId ||
      !titleIds.has(normalized.activity.correctTitleId)
    ) {
      out.push(issue(normalized, "Correct story title is not set."));
    }
  } else if (normalized.kind === "short_answer_reading") {
    for (const question of normalized.activity.questions) {
      if (
        question.acceptedAnswers.every((answer) => !answer.trim())
      ) {
        out.push(
          issue(
            normalized,
            `Question “${question.prompt.slice(0, 40) || question.id}” has no accepted answers.`,
          ),
        );
      }
    }
  } else if (normalized.kind === "listening_information") {
    for (const field of normalized.activity.fields) {
      if (field.acceptedAnswers.every((answer) => !answer.trim())) {
        out.push(
          issue(
            normalized,
            `Field “${field.label || field.id}” has no accepted answers.`,
          ),
        );
      }
    }
  } else if (normalized.kind === "cloze_choice") {
    for (const gap of listClozeChoiceGaps(normalized.activity.segments)) {
      if (gap.options.length < 2) {
        out.push(issue(normalized, `Cloze gap “${gap.id}” needs 2+ options.`));
      }
      if (!gap.options.includes(gap.correctAnswer)) {
        out.push(
          issue(normalized, `Cloze gap “${gap.id}” has an invalid correct answer.`),
        );
      }
    }
  } else if (normalized.kind === "cloze_open") {
    for (const gap of listClozeOpenGaps(normalized.activity.segments)) {
      if (gap.correctAnswers.every((answer) => !answer.trim())) {
        out.push(
          issue(normalized, `Open cloze gap “${gap.id}” has no accepted answers.`),
        );
      }
    }
  } else if (normalized.kind === "speaking_picture_differences") {
    for (const image of normalized.activity.images) {
      if (!hasMediaUrl(image.src)) {
        out.push(
          issue(normalized, `Speaking picture “${image.label}” URL is empty.`),
        );
      }
    }
  } else if (normalized.kind === "speaking_picture_story") {
    for (const frame of normalized.activity.frames) {
      if (!hasMediaUrl(frame.src)) {
        out.push(issue(normalized, `Story frame “${frame.id}” URL is empty.`));
      }
    }
  }

  return out;
}

/** Blocking issues that should prevent Assign until fixed. */
export function listAssessmentAssignIssues(
  definition: AssessmentDefinition,
): AssessmentAssignIssue[] {
  return definition.sections.flatMap((section) =>
    section.parts.flatMap(collectPartIssues),
  );
}
