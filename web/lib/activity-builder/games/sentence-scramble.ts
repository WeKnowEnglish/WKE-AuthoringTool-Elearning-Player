import {
  assertActivityShell,
  assertString,
  isRecord,
} from "@/lib/activity-builder/games/authoring-shell";
import type {
  GamesSentenceScrambleAuthoringDocument,
  GamesSentenceScrambleItem,
} from "@/lib/activity-builder/games/types-sentence-scramble";
import { chunkTokensForSentenceScramble } from "@/lib/games-sentence-scramble/scramble-tiles";
import { shuffleWithSeed } from "@/lib/vocabulary-templates/shuffle";

export type GamesSentenceScrambleLessonPlayerScreen = {
  type: "interaction";
  subtype: "drag_sentence";
  body_text: string;
  sentence_slots: string[];
  word_bank: string[];
  correct_order: string[];
  image_url?: string;
  image_fit?: "cover" | "contain";
  quiz_group_id: string;
  quiz_group_title: string;
  quiz_group_order: number;
};

export type GamesSentenceScrambleLessonPlayerPack = {
  version: 1;
  kind: "lessonplayer-games-pack";
  format: "sentence_scramble";
  quiz_group_id: string;
  quiz_group_title: string;
  activity_name: string;
  screens: GamesSentenceScrambleLessonPlayerScreen[];
};

function assertItem(value: unknown, index: number): GamesSentenceScrambleItem {
  if (!isRecord(value)) throw new Error(`Item ${index + 1} must be an object.`);
  const id = assertString(value.id, `Item ${index + 1} id`);
  if (!Array.isArray(value.correctOrder) || value.correctOrder.length < 2) {
    throw new Error(`Item "${id}" correctOrder needs at least 2 words.`);
  }
  const correctOrder = value.correctOrder.map((token, tokenIndex) =>
    assertString(token, `Item "${id}" correctOrder[${tokenIndex}]`),
  );
  const bodyText =
    typeof value.bodyText === "string" ? value.bodyText.trim() : "";
  const promptMode =
    value.promptMode === "scramble_only" ||
    value.promptMode === "additional_prompt"
      ? value.promptMode
      : bodyText
        ? "additional_prompt"
        : "scramble_only";
  if (promptMode === "additional_prompt" && !bodyText) {
    throw new Error(`Item "${id}" needs an additional prompt.`);
  }
  const item: GamesSentenceScrambleItem = {
    id,
    promptMode,
    correctOrder,
    ...(promptMode === "additional_prompt" ? { bodyText } : {}),
  };
  if (typeof value.imageUrl === "string" && value.imageUrl.trim()) {
    item.imageUrl = value.imageUrl.trim();
  }
  if (value.imageFit === "cover" || value.imageFit === "contain") {
    item.imageFit = value.imageFit;
  }
  return item;
}

export function validateGamesSentenceScrambleAuthoringDocument(
  value: unknown,
): GamesSentenceScrambleAuthoringDocument {
  const shell = assertActivityShell(value);
  if (shell.interaction.format !== "sentence_scramble") {
    throw new Error('interaction.format must be "sentence_scramble".');
  }
  const quizGroupId = assertString(shell.interaction.quizGroupId, "quizGroupId");
  const quizGroupTitle = assertString(shell.interaction.quizGroupTitle, "quizGroupTitle");
  const bodyTextDefault = assertString(shell.interaction.bodyTextDefault, "bodyTextDefault");
  if (!Array.isArray(shell.interaction.items) || shell.interaction.items.length < 1) {
    throw new Error("At least one scramble item is required.");
  }
  const items = shell.interaction.items.map((item, index) => assertItem(item, index));
  const itemIds = new Set<string>();
  for (const item of items) {
    if (itemIds.has(item.id)) throw new Error(`Duplicate item id "${item.id}".`);
    itemIds.add(item.id);
  }

  return {
    version: 1,
    kind: "activity-authoring",
    id: shell.id,
    name: shell.name,
    educationalIntent: shell.educationalIntent,
    content: shell.content,
    interaction: {
      type: "games",
      format: "sentence_scramble",
      quizGroupId,
      quizGroupTitle,
      bodyTextDefault,
      items,
    },
  };
}

export function exportGamesSentenceScrambleForLessonPlayer(
  document: GamesSentenceScrambleAuthoringDocument,
): GamesSentenceScrambleLessonPlayerPack {
  const valid = validateGamesSentenceScrambleAuthoringDocument(document);
  const { quizGroupId, quizGroupTitle, bodyTextDefault, items } = valid.interaction;

  return {
    version: 1,
    kind: "lessonplayer-games-pack",
    format: "sentence_scramble",
    quiz_group_id: quizGroupId,
    quiz_group_title: quizGroupTitle,
    activity_name: valid.name,
    screens: items.map((item, index) => {
      // Chunk very long authored lines so the player stays usable.
      const tiles = chunkTokensForSentenceScramble(item.correctOrder);
      const screen: GamesSentenceScrambleLessonPlayerScreen = {
        type: "interaction",
        subtype: "drag_sentence",
        body_text:
          item.promptMode === "additional_prompt"
            ? item.bodyText ?? bodyTextDefault
            : bodyTextDefault,
        sentence_slots: tiles.map(() => ""),
        word_bank: shuffleWithSeed(tiles, `${quizGroupId}:${item.id}:bank`),
        correct_order: tiles,
        quiz_group_id: quizGroupId,
        quiz_group_title: quizGroupTitle,
        quiz_group_order: index,
      };
      if (item.imageUrl) {
        screen.image_url = item.imageUrl;
        screen.image_fit = item.imageFit ?? "contain";
      }
      return screen;
    }),
  };
}
