import type {
  GamesLetterMixupAuthoringDocument,
  GamesLetterMixupItem,
} from "@/lib/activity-builder/games/types-letter-mixup";

export type GamesLetterMixupLessonPlayerScreen = {
  type: "interaction";
  subtype: "letter_mixup";
  auto_advance_on_pass?: true;
  prompt: string;
  items: Array<{
    id: string;
    target_word: string;
    accepted_words?: string[];
    hint?: string;
  }>;
  shuffle_letters: boolean;
  case_sensitive: boolean;
  image_url?: string;
  image_fit?: "cover" | "contain";
  image_audio_url?: string;
  image_use_tts?: boolean;
  image_read_aloud_text?: string;
  quiz_group_id: string;
  quiz_group_title: string;
  quiz_group_order: number;
};

export type GamesLetterMixupLessonPlayerPack = {
  version: 1;
  kind: "lessonplayer-games-pack";
  format: "letter_mixup";
  quiz_group_id: string;
  quiz_group_title: string;
  activity_name: string;
  screens: GamesLetterMixupLessonPlayerScreen[];
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

function assertItem(value: unknown, index: number): GamesLetterMixupItem {
  if (!isRecord(value)) throw new Error(`Item ${index + 1} must be an object.`);
  const id = assertString(value.id, `Item ${index + 1} id`);
  const targetWord = assertString(value.targetWord, `Item "${id}" targetWord`).replace(
    /\s+/g,
    " ",
  );
  const words = targetWord.split(" ").filter(Boolean);
  if (words.length < 1) {
    throw new Error(`Item "${id}" targetWord must include at least one word.`);
  }
  const letterCount = words.reduce((sum, word) => sum + word.length, 0);
  if (letterCount < 2) {
    throw new Error(`Item "${id}" targetWord needs at least 2 letters.`);
  }
  const item: GamesLetterMixupItem = { id, targetWord };

  if (typeof value.hint === "string" && value.hint.trim()) {
    item.hint = value.hint.trim();
  }
  if (Array.isArray(value.acceptedWords)) {
    const accepted = value.acceptedWords
      .filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim()))
      .map((entry) => entry.trim());
    if (accepted.length > 0) item.acceptedWords = accepted;
  }
  if (typeof value.imageUrl === "string" && value.imageUrl.trim()) {
    item.imageUrl = value.imageUrl.trim();
  }
  if (value.imageFit === "cover" || value.imageFit === "contain") {
    item.imageFit = value.imageFit;
  }
  if (typeof value.imageAudioUrl === "string" && value.imageAudioUrl.trim()) {
    item.imageAudioUrl = value.imageAudioUrl.trim();
  }
  if (typeof value.imageUseTts === "boolean") {
    item.imageUseTts = value.imageUseTts;
  }
  if (typeof value.imageReadAloudText === "string" && value.imageReadAloudText.trim()) {
    item.imageReadAloudText = value.imageReadAloudText.trim();
  }
  return item;
}

export function validateGamesLetterMixupAuthoringDocument(
  value: unknown,
): GamesLetterMixupAuthoringDocument {
  if (!isRecord(value)) throw new Error("Activity document must be an object.");
  if (value.version !== 1) {
    throw new Error("Letter scramble authoring documents must be version 1.");
  }
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
  const content: GamesLetterMixupAuthoringDocument["content"] = {};
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
  if (value.interaction.format !== "letter_mixup") {
    throw new Error('interaction.format must be "letter_mixup".');
  }

  const quizGroupId = assertString(value.interaction.quizGroupId, "quizGroupId");
  const quizGroupTitle = assertString(value.interaction.quizGroupTitle, "quizGroupTitle");
  const promptDefault = assertString(value.interaction.promptDefault, "promptDefault");
  const shuffleLettersDefault =
    typeof value.interaction.shuffleLettersDefault === "boolean"
      ? value.interaction.shuffleLettersDefault
      : true;
  const caseSensitiveDefault =
    typeof value.interaction.caseSensitiveDefault === "boolean"
      ? value.interaction.caseSensitiveDefault
      : false;

  if (!Array.isArray(value.interaction.items) || value.interaction.items.length < 1) {
    throw new Error("At least one scramble item is required.");
  }
  const items = value.interaction.items.map((item, index) => assertItem(item, index));
  const itemIds = new Set<string>();
  for (const item of items) {
    if (itemIds.has(item.id)) throw new Error(`Duplicate item id "${item.id}".`);
    itemIds.add(item.id);
  }

  const educationalIntent: GamesLetterMixupAuthoringDocument["educationalIntent"] = {
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
      format: "letter_mixup",
      quizGroupId,
      quizGroupTitle,
      promptDefault,
      shuffleLettersDefault,
      caseSensitiveDefault,
      items,
    },
  };
}

export function exportGamesLetterMixupForLessonPlayer(
  document: GamesLetterMixupAuthoringDocument,
): GamesLetterMixupLessonPlayerPack {
  const valid = validateGamesLetterMixupAuthoringDocument(document);
  const {
    quizGroupId,
    quizGroupTitle,
    promptDefault,
    shuffleLettersDefault,
    caseSensitiveDefault,
    items,
  } = valid.interaction;

  const screens: GamesLetterMixupLessonPlayerScreen[] = items.map((item, index) => {
    const exportedItem: GamesLetterMixupLessonPlayerScreen["items"][number] = {
      id: item.id,
      target_word: item.targetWord,
    };
    if (item.hint) exportedItem.hint = item.hint;
    if (item.acceptedWords?.length) exportedItem.accepted_words = [...item.acceptedWords];

    const screen: GamesLetterMixupLessonPlayerScreen = {
      type: "interaction",
      subtype: "letter_mixup",
      auto_advance_on_pass: true,
      prompt: promptDefault,
      items: [exportedItem],
      shuffle_letters: shuffleLettersDefault,
      case_sensitive: caseSensitiveDefault,
      quiz_group_id: quizGroupId,
      quiz_group_title: quizGroupTitle,
      quiz_group_order: index,
    };
    if (item.imageUrl) {
      screen.image_url = item.imageUrl;
      screen.image_fit = "contain";
    }
    if (item.imageAudioUrl) {
      screen.image_audio_url = item.imageAudioUrl;
      // Recorded audio overrides TTS in Lesson Player.
      screen.image_use_tts = false;
    } else if (item.imageUseTts) {
      screen.image_use_tts = true;
    }
    if (item.imageReadAloudText) screen.image_read_aloud_text = item.imageReadAloudText;
    return screen;
  });

  return {
    version: 1,
    kind: "lessonplayer-games-pack",
    format: "letter_mixup",
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
