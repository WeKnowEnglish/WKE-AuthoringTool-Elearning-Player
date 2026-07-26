import type {
  GamesAuthoringDocument,
  GamesMcItem,
  GamesMcOption,
} from "@/lib/activity-builder/games/types-mc";
import { GAMES_FORMATS } from "@/lib/activity-builder/games/types-mc";

/** Lesson Player mc_quiz screen payload (snake_case) plus quiz-group fields. */
export type GamesMcQuizLessonPlayerScreen = {
  type: "interaction";
  subtype: "mc_quiz";
  question: string;
  options: Array<{ id: string; label: string }>;
  correct_option_id: string;
  shuffle_options: boolean;
  image_url?: string;
  image_fit?: "cover" | "contain";
  body_text?: string;
  prompt_audio_url?: string;
  /** Authoring item id — used by Learning Track Compiler overlays. */
  item_id?: string;
  quiz_group_id: string;
  quiz_group_title: string;
  quiz_group_order: number;
};

/** Multi-screen pack for Lesson Player pilots / import. */
export type GamesMcQuizLessonPlayerPack = {
  version: 1;
  kind: "lessonplayer-games-pack";
  format: "multiple_choice";
  quiz_group_id: string;
  quiz_group_title: string;
  activity_name: string;
  screens: GamesMcQuizLessonPlayerScreen[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value.trim();
}

function assertOption(value: unknown, label: string): GamesMcOption {
  if (!isRecord(value)) throw new Error(`${label} must be an object.`);
  return {
    id: assertString(value.id, `${label}.id`),
    label: assertString(value.label, `${label}.label`),
  };
}

function assertItem(value: unknown, index: number): GamesMcItem {
  if (!isRecord(value)) throw new Error(`Item ${index + 1} must be an object.`);
  const id = assertString(value.id, `Item ${index + 1} id`);
  const question = assertString(value.question, `Item "${id}" question`);
  if (!Array.isArray(value.options) || value.options.length < 2) {
    throw new Error(`Item "${id}" needs at least 2 options.`);
  }
  const options = value.options.map((option, optionIndex) =>
    assertOption(option, `Item "${id}" option ${optionIndex + 1}`),
  );
  const optionIds = new Set<string>();
  for (const option of options) {
    if (optionIds.has(option.id)) {
      throw new Error(`Item "${id}" has duplicate option id "${option.id}".`);
    }
    optionIds.add(option.id);
  }
  const correctOptionId = assertString(value.correctOptionId, `Item "${id}" correctOptionId`);
  if (!optionIds.has(correctOptionId)) {
    throw new Error(`Item "${id}" correctOptionId must match an option id.`);
  }

  const item: GamesMcItem = {
    id,
    question,
    options,
    correctOptionId,
  };

  if (typeof value.bodyText === "string" && value.bodyText.trim()) {
    item.bodyText = value.bodyText.trim();
  }
  if (typeof value.imageUrl === "string" && value.imageUrl.trim()) {
    item.imageUrl = value.imageUrl.trim();
  }
  if (value.imageFit === "cover" || value.imageFit === "contain") {
    item.imageFit = value.imageFit;
  }
  if (typeof value.promptAudioUrl === "string" && value.promptAudioUrl.trim()) {
    item.promptAudioUrl = value.promptAudioUrl.trim();
  }
  if (typeof value.shuffleOptions === "boolean") {
    item.shuffleOptions = value.shuffleOptions;
  }

  return item;
}

/** Validate and return a typed Games MCQ authoring document. */
export function validateGamesAuthoringDocument(value: unknown): GamesAuthoringDocument {
  if (!isRecord(value)) throw new Error("Activity document must be an object.");
  if (value.version !== 1) throw new Error("Quiz authoring documents must be version 1.");
  if (value.kind !== "activity-authoring") {
    throw new Error('Document kind must be "activity-authoring".');
  }

  const id = assertString(value.id, "Activity id");
  const name = assertString(value.name, "Activity name");

  if (!isRecord(value.educationalIntent)) throw new Error("educationalIntent is required.");
  const objective = assertString(value.educationalIntent.objective, "Objective");
  const successCriteria = assertString(
    value.educationalIntent.successCriteria,
    "Success criteria",
  );

  if (!isRecord(value.content)) throw new Error("content is required.");
  const content: GamesAuthoringDocument["content"] = {};
  if (typeof value.content.instruction === "string" && value.content.instruction.trim()) {
    content.instruction = value.content.instruction.trim();
  }
  if (
    typeof value.content.completionMessage === "string" &&
    value.content.completionMessage.trim()
  ) {
    content.completionMessage = value.content.completionMessage.trim();
  }

  if (!isRecord(value.interaction)) throw new Error("interaction is required.");
  if (value.interaction.type !== "games") {
    throw new Error('interaction.type must be "games".');
  }
  const format = assertString(value.interaction.format, "interaction.format");
  if (!(GAMES_FORMATS as readonly string[]).includes(format)) {
    throw new Error(`Unsupported games format "${format}".`);
  }
  if (format !== "multiple_choice") {
    throw new Error('This Studio slice only supports format "multiple_choice".');
  }

  const quizGroupId = assertString(value.interaction.quizGroupId, "quizGroupId");
  const quizGroupTitle = assertString(value.interaction.quizGroupTitle, "quizGroupTitle");
  const shuffleOptionsDefault =
    typeof value.interaction.shuffleOptionsDefault === "boolean"
      ? value.interaction.shuffleOptionsDefault
      : false;

  if (!Array.isArray(value.interaction.items) || value.interaction.items.length < 1) {
    throw new Error("At least one quiz item is required.");
  }

  const items = value.interaction.items.map((item, index) => assertItem(item, index));
  const itemIds = new Set<string>();
  for (const item of items) {
    if (itemIds.has(item.id)) throw new Error(`Duplicate item id "${item.id}".`);
    itemIds.add(item.id);
  }

  const educationalIntent: GamesAuthoringDocument["educationalIntent"] = {
    objective,
    successCriteria,
  };
  if (typeof value.educationalIntent.cefr === "string" && value.educationalIntent.cefr.trim()) {
    educationalIntent.cefr = value.educationalIntent.cefr.trim();
  }
  if (Array.isArray(value.educationalIntent.vocabulary)) {
    educationalIntent.vocabulary = value.educationalIntent.vocabulary
      .filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim()))
      .map((entry) => entry.trim());
  }

  return {
    version: 1,
    kind: "activity-authoring",
    id,
    name,
    educationalIntent,
    content,
    interaction: {
      type: "games",
      format: "multiple_choice",
      quizGroupId,
      quizGroupTitle,
      shuffleOptionsDefault,
      items,
    },
  };
}

/** Export a Lesson Player games pack (multiple mc_quiz screens). */
export function exportGamesMcQuizForLessonPlayer(
  document: GamesAuthoringDocument,
): GamesMcQuizLessonPlayerPack {
  const valid = validateGamesAuthoringDocument(document);
  const { quizGroupId, quizGroupTitle, shuffleOptionsDefault, items } = valid.interaction;

  const screens: GamesMcQuizLessonPlayerScreen[] = items.map((item, index) => {
    const screen: GamesMcQuizLessonPlayerScreen = {
      type: "interaction",
      subtype: "mc_quiz",
      question: item.question,
      options: item.options.map((option) => ({ id: option.id, label: option.label })),
      correct_option_id: item.correctOptionId,
      shuffle_options: item.shuffleOptions ?? shuffleOptionsDefault,
      item_id: item.id,
      quiz_group_id: quizGroupId,
      quiz_group_title: quizGroupTitle,
      quiz_group_order: index,
    };
    if (item.bodyText) screen.body_text = item.bodyText;
    if (item.imageUrl) {
      screen.image_url = item.imageUrl;
      screen.image_fit = item.imageFit ?? "contain";
    }
    if (item.promptAudioUrl) screen.prompt_audio_url = item.promptAudioUrl;
    return screen;
  });

  return {
    version: 1,
    kind: "lessonplayer-games-pack",
    format: "multiple_choice",
    quiz_group_id: quizGroupId,
    quiz_group_title: quizGroupTitle,
    activity_name: valid.name,
    screens,
  };
}

export function downloadTextFile(text: string, filename: string): void {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
