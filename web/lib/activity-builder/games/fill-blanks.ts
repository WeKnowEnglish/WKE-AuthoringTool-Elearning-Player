import {
  assertActivityShell,
  assertString,
  isRecord,
} from "@/lib/activity-builder/games/authoring-shell";
import type {
  GamesFillBlank,
  GamesFillBlanksAuthoringDocument,
  GamesFillBlanksItem,
} from "@/lib/activity-builder/games/types-fill-blanks";

export type GamesFillBlanksLessonPlayerScreen = {
  type: "interaction";
  subtype: "fill_blanks";
  body_text: string;
  template: string;
  blanks: Array<{ id: string; acceptable: string[] }>;
  word_bank: string[];
  image_url?: string;
  image_fit?: "cover" | "contain";
  quiz_group_id: string;
  quiz_group_title: string;
  quiz_group_order: number;
};

export type GamesFillBlanksLessonPlayerPack = {
  version: 1;
  kind: "lessonplayer-games-pack";
  format: "fill_blanks";
  quiz_group_id: string;
  quiz_group_title: string;
  activity_name: string;
  screens: GamesFillBlanksLessonPlayerScreen[];
};

function assertBlank(value: unknown, itemId: string, index: number): GamesFillBlank {
  if (!isRecord(value)) throw new Error(`Item "${itemId}" blank ${index + 1} must be an object.`);
  const id = assertString(value.id, `Item "${itemId}" blank ${index + 1} id`);
  if (!Array.isArray(value.acceptable) || value.acceptable.length < 1) {
    throw new Error(`Item "${itemId}" blank "${id}" needs acceptable answers.`);
  }
  const acceptable = value.acceptable.map((entry, answerIndex) =>
    assertString(entry, `Item "${itemId}" blank "${id}" acceptable[${answerIndex}]`),
  );
  return { id, acceptable };
}

function assertItem(value: unknown, index: number): GamesFillBlanksItem {
  if (!isRecord(value)) throw new Error(`Item ${index + 1} must be an object.`);
  const id = assertString(value.id, `Item ${index + 1} id`);
  const template = assertString(value.template, `Item "${id}" template`);
  if (!Array.isArray(value.blanks) || value.blanks.length < 1) {
    throw new Error(`Item "${id}" needs at least one blank.`);
  }
  if (!Array.isArray(value.wordBank) || value.wordBank.length < 1) {
    throw new Error(`Item "${id}" needs a wordBank.`);
  }
  const blanks = value.blanks.map((blank, blankIndex) => assertBlank(blank, id, blankIndex));
  const wordBank = value.wordBank.map((entry, wordIndex) =>
    assertString(entry, `Item "${id}" wordBank[${wordIndex}]`),
  );
  for (const blank of blanks) {
    if (!template.includes(`__${blank.id}__`)) {
      throw new Error(`Item "${id}" template is missing __${blank.id}__.`);
    }
  }

  const item: GamesFillBlanksItem = { id, template, blanks, wordBank };
  if (typeof value.bodyText === "string" && value.bodyText.trim()) {
    item.bodyText = value.bodyText.trim();
  }
  if (typeof value.imageUrl === "string" && value.imageUrl.trim()) {
    item.imageUrl = value.imageUrl.trim();
  }
  if (value.imageFit === "cover" || value.imageFit === "contain") {
    item.imageFit = value.imageFit;
  }
  return item;
}

export function validateGamesFillBlanksAuthoringDocument(
  value: unknown,
): GamesFillBlanksAuthoringDocument {
  const shell = assertActivityShell(value);
  if (shell.interaction.format !== "fill_blanks") {
    throw new Error('interaction.format must be "fill_blanks".');
  }
  const quizGroupId = assertString(shell.interaction.quizGroupId, "quizGroupId");
  const quizGroupTitle = assertString(shell.interaction.quizGroupTitle, "quizGroupTitle");
  const bodyTextDefault = assertString(shell.interaction.bodyTextDefault, "bodyTextDefault");
  if (!Array.isArray(shell.interaction.items) || shell.interaction.items.length < 1) {
    throw new Error("At least one fill-blanks item is required.");
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
      format: "fill_blanks",
      quizGroupId,
      quizGroupTitle,
      bodyTextDefault,
      items,
    },
  };
}

export function exportGamesFillBlanksForLessonPlayer(
  document: GamesFillBlanksAuthoringDocument,
): GamesFillBlanksLessonPlayerPack {
  const valid = validateGamesFillBlanksAuthoringDocument(document);
  const { quizGroupId, quizGroupTitle, bodyTextDefault, items } = valid.interaction;

  return {
    version: 1,
    kind: "lessonplayer-games-pack",
    format: "fill_blanks",
    quiz_group_id: quizGroupId,
    quiz_group_title: quizGroupTitle,
    activity_name: valid.name,
    screens: items.map((item, index) => {
      const screen: GamesFillBlanksLessonPlayerScreen = {
        type: "interaction",
        subtype: "fill_blanks",
        body_text: item.bodyText ?? bodyTextDefault,
        template: item.template,
        blanks: item.blanks.map((blank) => ({
          id: blank.id,
          acceptable: [...blank.acceptable],
        })),
        word_bank: [...item.wordBank],
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
