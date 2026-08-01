import {
  assertActivityShell,
  assertString,
  isRecord,
} from "@/lib/activity-builder/games/authoring-shell";
import type {
  GamesTrueFalseAuthoringDocument,
  GamesTrueFalseItem,
} from "@/lib/activity-builder/games/types-true-false";

export type GamesTrueFalseLessonPlayerScreen = {
  type: "interaction";
  subtype: "true_false";
  statement: string;
  correct: boolean;
  picture_truth_statement?: string;
  image_url?: string;
  image_fit?: "cover" | "contain";
  quiz_group_id: string;
  quiz_group_title: string;
  quiz_group_order: number;
};

export type GamesTrueFalseLessonPlayerPack = {
  version: 1;
  kind: "lessonplayer-games-pack";
  format: "true_false";
  quiz_group_id: string;
  quiz_group_title: string;
  activity_name: string;
  screens: GamesTrueFalseLessonPlayerScreen[];
};

function assertItem(value: unknown, index: number): GamesTrueFalseItem {
  if (!isRecord(value)) throw new Error(`Item ${index + 1} must be an object.`);
  const id = assertString(value.id, `Item ${index + 1} id`);
  const statement = assertString(value.statement, `Item "${id}" statement`);
  if (typeof value.correct !== "boolean") {
    throw new Error(`Item "${id}" correct must be a boolean.`);
  }
  const item: GamesTrueFalseItem = {
    id,
    statement,
    correct: value.correct,
  };
  if (typeof value.pictureTruthStatement === "string" && value.pictureTruthStatement.trim()) {
    item.pictureTruthStatement = value.pictureTruthStatement.trim();
  }
  if (typeof value.imageUrl === "string" && value.imageUrl.trim()) {
    item.imageUrl = value.imageUrl.trim();
  }
  if (value.imageFit === "cover" || value.imageFit === "contain") {
    item.imageFit = value.imageFit;
  }
  return item;
}

export function validateGamesTrueFalseAuthoringDocument(
  value: unknown,
): GamesTrueFalseAuthoringDocument {
  const shell = assertActivityShell(value);
  if (shell.interaction.format !== "true_false") {
    throw new Error('interaction.format must be "true_false".');
  }
  const quizGroupId = assertString(shell.interaction.quizGroupId, "quizGroupId");
  const quizGroupTitle = assertString(shell.interaction.quizGroupTitle, "quizGroupTitle");
  if (!Array.isArray(shell.interaction.items) || shell.interaction.items.length < 1) {
    throw new Error("At least one true/false item is required.");
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
      format: "true_false",
      quizGroupId,
      quizGroupTitle,
      items,
    },
  };
}

export function exportGamesTrueFalseForLessonPlayer(
  document: GamesTrueFalseAuthoringDocument,
): GamesTrueFalseLessonPlayerPack {
  const valid = validateGamesTrueFalseAuthoringDocument(document);
  const { quizGroupId, quizGroupTitle, items } = valid.interaction;

  return {
    version: 1,
    kind: "lessonplayer-games-pack",
    format: "true_false",
    quiz_group_id: quizGroupId,
    quiz_group_title: quizGroupTitle,
    activity_name: valid.name,
    screens: items.map((item, index) => {
      const screen: GamesTrueFalseLessonPlayerScreen = {
        type: "interaction",
        subtype: "true_false",
        statement: item.statement,
        correct: item.correct,
        quiz_group_id: quizGroupId,
        quiz_group_title: quizGroupTitle,
        quiz_group_order: index,
      };
      if (item.pictureTruthStatement) {
        screen.picture_truth_statement = item.pictureTruthStatement;
      }
      if (item.imageUrl) {
        screen.image_url = item.imageUrl;
        screen.image_fit = item.imageFit ?? "contain";
      }
      return screen;
    }),
  };
}
