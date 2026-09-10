import type { HomeworkCollectionPart } from "@/lib/homework-collections/types";
import {
  documentModuleFormatLabel,
  documentModuleItemIds,
} from "@/lib/homework-collections/document-module";
import { lessonPlayerPackItemIds } from "@/lib/homework-collections/lesson-player-pack";
import { asDefinitionMatchDraft } from "@/lib/definition-match/draft";
import { asPictureStoryDraft } from "@/lib/picture-story/draft";
import { asReadAndAnswerDraft } from "@/lib/read-and-answer/draft";

type ModuleQuestion = {
  id: string;
  prompt: string;
  options: Array<{ id: string; text: string }>;
};

function documentModuleQuestions(
  part: Extract<HomeworkCollectionPart, { kind: "document_module" }>,
): ModuleQuestion[] {
  if (part.moduleFormat === "picture_story") {
    return asPictureStoryDraft(part.document).questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      options: question.options,
    }));
  }
  if (part.moduleFormat === "read_and_answer") {
    return asReadAndAnswerDraft(part.document).questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      options: question.options,
    }));
  }
  if (part.moduleFormat === "definition_match") {
    return asDefinitionMatchDraft(part.document).pairs.map((pair) => ({
      id: pair.id,
      prompt: pair.word,
      options: [],
    }));
  }
  return [];
}

/** Teacher-results prompt label for one frozen collection item. */
export function homeworkCollectionItemLabel(
  part: HomeworkCollectionPart,
  itemId: string,
): string {
  if (part.kind === "multiple_choice") {
    return part.questions.find((item) => item.id === itemId)?.prompt ?? itemId;
  }
  if (part.kind === "line_match") {
    return part.pairs.find((item) => item.id === itemId)?.left ?? itemId;
  }
  if (part.kind === "free_response") {
    return part.prompts.find((item) => item.id === itemId)?.prompt ?? itemId;
  }
  if (part.kind === "speaking_prompt") return part.prompt;
  if (part.kind === "listening_item_match") {
    return part.activity.prompts.find((item) => item.id === itemId)?.label ?? itemId;
  }
  if (part.kind === "lesson_player_pack") {
    const index = lessonPlayerPackItemIds(part).indexOf(itemId);
    return index >= 0 ? `${part.studioFormat} item ${index + 1}` : itemId;
  }
  if (part.kind === "document_module") {
    const questions = documentModuleQuestions(part);
    const question = questions.find((item) => item.id === itemId);
    if (question?.prompt.trim()) return question.prompt.trim();
    const index = documentModuleItemIds(part).indexOf(itemId);
    return index >= 0
      ? `${documentModuleFormatLabel(part.moduleFormat)} ${index + 1}`
      : itemId;
  }
  if (
    part.kind === "letter_mixup" ||
    part.kind === "listen_and_choose" ||
    part.kind === "sentence_scramble"
  ) {
    return part.items.find((item) => item.id === itemId)?.prompt ?? itemId;
  }
  return itemId;
}

/** Teacher-results student answer, resolving option ids to option text. */
export function homeworkCollectionDisplayAnswer(
  part: HomeworkCollectionPart,
  itemId: string,
  answer: string,
): string {
  if (part.kind === "multiple_choice") {
    for (const question of part.questions) {
      const option = question.options.find((item) => item.id === answer);
      if (option) return option.text;
    }
  }
  if (part.kind === "line_match") {
    const pair = part.pairs.find((item) => item.id === answer);
    if (pair) return pair.right || "Picture match";
  }
  if (part.kind === "listen_and_choose") {
    for (const item of part.items) {
      const choice = item.choices.find((entry) => entry.id === answer);
      if (choice) return choice.label || "Picture choice";
    }
  }
  if (part.kind === "listening_item_match") {
    const choice = part.activity.choices.find((entry) => entry.id === answer);
    if (choice) return choice.label || "Choice";
  }
  if (part.kind === "document_module") {
    if (part.moduleFormat === "definition_match") {
      const matched = asDefinitionMatchDraft(part.document).pairs.find(
        (pair) => pair.id === answer,
      );
      if (matched?.definition.trim()) return matched.definition.trim();
    }
    const question = documentModuleQuestions(part).find((item) => item.id === itemId);
    const option = question?.options.find((entry) => entry.id === answer);
    if (option?.text.trim()) return option.text.trim();
  }
  return answer;
}
