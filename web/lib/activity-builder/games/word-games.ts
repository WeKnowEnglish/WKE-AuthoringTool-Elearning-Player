import type {
  GamesCrosswordClueMode,
  GamesMemoryTextMode,
  GamesWordGameAuthoringDocument,
  GamesWordGameFormat,
  GamesWordGameItem,
} from "@/lib/activity-builder/games/types-word-games";

export type GamesWordGameLessonPlayerPack = {
  version: 1;
  kind: "lessonplayer-games-pack";
  format: GamesWordGameFormat;
  quiz_group_id: string;
  quiz_group_title: string;
  activity_name: string;
  screens: Array<Record<string, unknown>>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value.trim();
}

function cleanPuzzleWord(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function letterCount(value: string): number {
  return (value.match(/[A-Za-z]/g) ?? []).length;
}

function validateItem(value: unknown, index: number): GamesWordGameItem {
  if (!isRecord(value)) throw new Error(`Word ${index + 1} must be an object.`);
  const id = requiredString(value.id, `Word ${index + 1} id`);
  const word = cleanPuzzleWord(requiredString(value.word, `Word "${id}"`));
  if (letterCount(word) < 2) {
    throw new Error(`Word "${word}" needs at least two letters.`);
  }
  const item: GamesWordGameItem = { id, word };
  if (typeof value.clue === "string" && value.clue.trim()) item.clue = value.clue.trim();
  if (typeof value.definition === "string" && value.definition.trim()) {
    item.definition = value.definition.trim();
  }
  if (typeof value.example === "string" && value.example.trim()) {
    item.example = value.example.trim();
  }
  if (typeof value.imageUrl === "string" && value.imageUrl.trim()) {
    item.imageUrl = value.imageUrl.trim();
  }
  if (value.imageFit === "cover" || value.imageFit === "contain") {
    item.imageFit = value.imageFit;
  }
  return item;
}

export function validateGamesWordGameAuthoringDocument(
  value: unknown,
  expectedFormat?: GamesWordGameFormat,
): GamesWordGameAuthoringDocument {
  if (!isRecord(value)) throw new Error("Activity document must be an object.");
  if (value.version !== 1 || value.kind !== "activity-authoring") {
    throw new Error("Word-game authoring documents must be version 1 activity-authoring documents.");
  }
  const id = requiredString(value.id, "Activity id");
  const name = requiredString(value.name, "Activity name");
  if (!isRecord(value.educationalIntent)) throw new Error("educationalIntent is required.");
  const objective = requiredString(value.educationalIntent.objective, "Objective");
  const successCriteria = requiredString(
    value.educationalIntent.successCriteria,
    "Success criteria",
  );
  if (!isRecord(value.content)) throw new Error("content is required.");
  if (!isRecord(value.interaction)) throw new Error("interaction is required.");
  if (value.interaction.type !== "games") throw new Error('interaction.type must be "games".');
  const format = value.interaction.format;
  if (format !== "wordsearch" && format !== "crossword" && format !== "memory") {
    throw new Error("Unsupported word-game format.");
  }
  if (expectedFormat && format !== expectedFormat) {
    throw new Error(`Expected ${expectedFormat}, received ${format}.`);
  }
  const quizGroupId = requiredString(value.interaction.quizGroupId, "quizGroupId");
  const quizGroupTitle = requiredString(value.interaction.quizGroupTitle, "quizGroupTitle");
  const promptDefault = requiredString(value.interaction.promptDefault, "promptDefault");
  if (!Array.isArray(value.interaction.items) || value.interaction.items.length < 2) {
    throw new Error(`${format === "memory" ? "Memory" : "This puzzle"} needs at least two words.`);
  }
  const items = value.interaction.items.map(validateItem);
  const ids = new Set<string>();
  const words = new Set<string>();
  for (const item of items) {
    const key = item.word.toLocaleLowerCase();
    if (ids.has(item.id)) throw new Error(`Duplicate word id "${item.id}".`);
    if (words.has(key)) throw new Error(`Duplicate word "${item.word}".`);
    ids.add(item.id);
    words.add(key);
  }

  const memoryTextMode: GamesMemoryTextMode =
    value.interaction.memoryTextMode === "definition" ||
    value.interaction.memoryTextMode === "example"
      ? value.interaction.memoryTextMode
      : "word";
  const crosswordClueMode: GamesCrosswordClueMode =
    value.interaction.crosswordClueMode === "definition" ||
    value.interaction.crosswordClueMode === "example"
      ? value.interaction.crosswordClueMode
      : "definition_or_example";
  const allowBackwards = value.interaction.allowBackwards === true;
  const allowDiagonals =
    typeof value.interaction.allowDiagonals === "boolean"
      ? value.interaction.allowDiagonals
      : true;
  const allowBackwardsDiagonals =
    typeof value.interaction.allowBackwardsDiagonals === "boolean"
      ? value.interaction.allowBackwardsDiagonals
      : allowBackwards;
  const educationalIntent: GamesWordGameAuthoringDocument["educationalIntent"] = {
    objective,
    successCriteria,
  };
  if (typeof value.educationalIntent.cefr === "string" && value.educationalIntent.cefr.trim()) {
    educationalIntent.cefr = value.educationalIntent.cefr.trim();
  }
  educationalIntent.vocabulary = items.map((item) => item.word);

  const content: GamesWordGameAuthoringDocument["content"] = {};
  if (typeof value.content.instruction === "string" && value.content.instruction.trim()) {
    content.instruction = value.content.instruction.trim();
  }
  if (
    typeof value.content.completionMessage === "string" &&
    value.content.completionMessage.trim()
  ) {
    content.completionMessage = value.content.completionMessage.trim();
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
      format,
      quizGroupId,
      quizGroupTitle,
      promptDefault,
      items,
      gridSize:
        typeof value.interaction.gridSize === "number"
          ? Math.min(18, Math.max(8, Math.round(value.interaction.gridSize)))
          : 12,
      allowBackwards,
      allowDiagonals,
      allowBackwardsDiagonals,
      memoryUsePictures: value.interaction.memoryUsePictures !== false,
      memoryTextMode,
      crosswordClueMode,
    },
  };
}

function crosswordClue(item: GamesWordGameItem, mode: GamesCrosswordClueMode): string {
  if (item.clue) return item.clue;
  if (mode === "definition") return item.definition || fallbackClue(item);
  if (mode === "example") return item.example || fallbackClue(item);
  return item.definition || item.example || fallbackClue(item);
}

function fallbackClue(item: GamesWordGameItem): string {
  return `Vocabulary word: ${letterCount(item.word)} letters`;
}

function memoryText(item: GamesWordGameItem, mode: GamesMemoryTextMode): string {
  if (mode === "definition") return item.definition || item.word;
  if (mode === "example") return item.example || item.word;
  return item.word;
}

export function exportGamesWordGameForLessonPlayer(
  document: GamesWordGameAuthoringDocument,
): GamesWordGameLessonPlayerPack {
  const valid = validateGamesWordGameAuthoringDocument(document);
  const { format, items, quizGroupId, quizGroupTitle, promptDefault } = valid.interaction;
  const common = {
    type: "interaction",
    subtype: format,
    prompt: promptDefault,
    quiz_group_id: quizGroupId,
    quiz_group_title: quizGroupTitle,
    quiz_group_order: 0,
  };
  let screen: Record<string, unknown>;
  if (format === "wordsearch") {
    const longest = Math.max(...items.map((item) => letterCount(item.word)));
    screen = {
      ...common,
      words: items.map((item) => ({ id: item.id, word: item.word })),
      grid_size: Math.min(18, Math.max(valid.interaction.gridSize ?? 12, longest)),
      allow_backwards: valid.interaction.allowBackwards === true,
      allow_diagonals: valid.interaction.allowDiagonals === true,
      allow_backwards_diagonals:
        valid.interaction.allowBackwardsDiagonals === true,
    };
  } else if (format === "crossword") {
    const clueMode = valid.interaction.crosswordClueMode ?? "definition_or_example";
    screen = {
      ...common,
      entries: items.map((item) => ({
        id: item.id,
        answer: item.word,
        clue: crosswordClue(item, clueMode),
      })),
    };
  } else {
    const textMode = valid.interaction.memoryTextMode ?? "word";
    screen = {
      ...common,
      pairs: items.map((item) => ({
        id: item.id,
        word: item.word,
        text: memoryText(item, textMode),
        text_kind: textMode,
        image_url: item.imageUrl,
        image_fit: item.imageFit ?? "contain",
      })),
    };
  }
  return {
    version: 1,
    kind: "lessonplayer-games-pack",
    format,
    quiz_group_id: quizGroupId,
    quiz_group_title: quizGroupTitle,
    activity_name: valid.name,
    screens: [screen],
  };
}
