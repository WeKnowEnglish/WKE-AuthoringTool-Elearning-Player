import type {
  GamesFlashcardCard,
  GamesFlashcardFace,
  GamesFlashcardFaceValues,
  GamesFlashcardsAuthoringDocument,
} from "@/lib/activity-builder/games/types-flashcards";
import { GAMES_FLASHCARD_FACES } from "@/lib/activity-builder/games/types-flashcards";

export type GamesFlashcardsLessonPlayerScreen = {
  type: "interaction";
  subtype: "flashcards";
  activity_name?: string;
  body_text?: string;
  cards: Array<{
    id: string;
    faces: {
      word?: string;
      definition?: string;
      example?: string;
      picture_url?: string;
    };
    front_faces: GamesFlashcardFace[];
    back_faces: GamesFlashcardFace[];
    prompt_audio_url?: string;
    example_audio_url?: string;
    definition_audio_url?: string;
  }>;
  shuffle_cards: boolean;
  auto_play?: boolean;
  quiz_group_id: string;
  quiz_group_title: string;
};

export type GamesFlashcardsLessonPlayerPack = {
  version: 1;
  kind: "lessonplayer-games-pack";
  format: "flashcards";
  quiz_group_id: string;
  quiz_group_title: string;
  activity_name: string;
  screens: GamesFlashcardsLessonPlayerScreen[];
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

function assertFace(value: unknown, label: string): GamesFlashcardFace {
  const face = assertString(value, label);
  if (!(GAMES_FLASHCARD_FACES as readonly string[]).includes(face)) {
    throw new Error(`${label} must be a known flashcard face.`);
  }
  return face as GamesFlashcardFace;
}

function assertFaces(value: unknown, label: string): GamesFlashcardFace[] {
  if (!Array.isArray(value) || value.length < 1) {
    throw new Error(`${label} needs at least one face.`);
  }
  return value.map((face, index) => assertFace(face, `${label}[${index}]`));
}

function assertFaceValues(value: unknown, label: string): GamesFlashcardFaceValues {
  if (!isRecord(value)) throw new Error(`${label} must be an object.`);
  const faces: GamesFlashcardFaceValues = {};
  if (typeof value.word === "string" && value.word.trim()) faces.word = value.word.trim();
  if (typeof value.definition === "string" && value.definition.trim()) {
    faces.definition = value.definition.trim();
  }
  if (typeof value.example === "string" && value.example.trim()) {
    faces.example = value.example.trim();
  }
  if (typeof value.pictureUrl === "string" && value.pictureUrl.trim()) {
    faces.pictureUrl = value.pictureUrl.trim();
  }
  if (!faces.word && !faces.definition && !faces.example && !faces.pictureUrl) {
    throw new Error(`${label} needs at least one face value.`);
  }
  return faces;
}

function assertCard(value: unknown, index: number): GamesFlashcardCard {
  if (!isRecord(value)) throw new Error(`Card ${index + 1} must be an object.`);
  const id = assertString(value.id, `Card ${index + 1} id`);
  const faces = assertFaceValues(value.faces, `Card "${id}" faces`);
  const frontFaces = assertFaces(value.frontFaces, `Card "${id}" frontFaces`);
  const backFaces = assertFaces(value.backFaces, `Card "${id}" backFaces`);
  const overlap = frontFaces.filter((face) => backFaces.includes(face));
  if (overlap.length > 0) {
    throw new Error(`Card "${id}" faces cannot be on both sides: ${overlap.join(", ")}.`);
  }
  const promptAudioUrl =
    typeof value.promptAudioUrl === "string" ? value.promptAudioUrl.trim() : "";
  const exampleAudioUrl =
    typeof value.exampleAudioUrl === "string" ? value.exampleAudioUrl.trim() : "";
  const definitionAudioUrl =
    typeof value.definitionAudioUrl === "string"
      ? value.definitionAudioUrl.trim()
      : "";
  const card: GamesFlashcardCard = { id, faces, frontFaces, backFaces };
  if (promptAudioUrl) card.promptAudioUrl = promptAudioUrl;
  if (exampleAudioUrl) card.exampleAudioUrl = exampleAudioUrl;
  if (definitionAudioUrl) card.definitionAudioUrl = definitionAudioUrl;
  return card;
}

export function validateGamesFlashcardsAuthoringDocument(
  value: unknown,
): GamesFlashcardsAuthoringDocument {
  if (!isRecord(value)) throw new Error("Activity document must be an object.");
  if (value.version !== 1) throw new Error("Flashcards authoring documents must be version 1.");
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
  const content: GamesFlashcardsAuthoringDocument["content"] = {};
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
  if (value.interaction.format !== "flashcards") {
    throw new Error('interaction.format must be "flashcards".');
  }

  const quizGroupId = assertString(value.interaction.quizGroupId, "quizGroupId");
  const quizGroupTitle = assertString(value.interaction.quizGroupTitle, "quizGroupTitle");
  const shuffleCardsDefault =
    typeof value.interaction.shuffleCardsDefault === "boolean"
      ? value.interaction.shuffleCardsDefault
      : false;
  const defaultFrontFaces = assertFaces(
    value.interaction.defaultFrontFaces,
    "defaultFrontFaces",
  );
  const defaultBackFaces = assertFaces(value.interaction.defaultBackFaces, "defaultBackFaces");

  if (!Array.isArray(value.interaction.cards) || value.interaction.cards.length < 1) {
    throw new Error("At least one flashcard is required.");
  }
  const cards = value.interaction.cards.map((card, index) => assertCard(card, index));
  const cardIds = new Set<string>();
  for (const card of cards) {
    if (cardIds.has(card.id)) throw new Error(`Duplicate card id "${card.id}".`);
    cardIds.add(card.id);
  }

  const educationalIntent: GamesFlashcardsAuthoringDocument["educationalIntent"] = {
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
      format: "flashcards",
      quizGroupId,
      quizGroupTitle,
      shuffleCardsDefault,
      defaultFrontFaces,
      defaultBackFaces,
      cards,
    },
  };
}

export function exportGamesFlashcardsForLessonPlayer(
  document: GamesFlashcardsAuthoringDocument,
): GamesFlashcardsLessonPlayerPack {
  const valid = validateGamesFlashcardsAuthoringDocument(document);
  const screen: GamesFlashcardsLessonPlayerScreen = {
    type: "interaction",
    subtype: "flashcards",
    activity_name: valid.name,
    cards: valid.interaction.cards.map((card) => {
      const faces: GamesFlashcardsLessonPlayerScreen["cards"][number]["faces"] = {};
      if (card.faces.word) faces.word = card.faces.word;
      if (card.faces.definition) faces.definition = card.faces.definition;
      if (card.faces.example) faces.example = card.faces.example;
      if (card.faces.pictureUrl) faces.picture_url = card.faces.pictureUrl;
      const exported: GamesFlashcardsLessonPlayerScreen["cards"][number] = {
        id: card.id,
        faces,
        front_faces: [...card.frontFaces],
        back_faces: [...card.backFaces],
      };
      if (card.promptAudioUrl) exported.prompt_audio_url = card.promptAudioUrl;
      if (card.exampleAudioUrl) exported.example_audio_url = card.exampleAudioUrl;
      if (card.definitionAudioUrl) {
        exported.definition_audio_url = card.definitionAudioUrl;
      }
      return exported;
    }),
    shuffle_cards: valid.interaction.shuffleCardsDefault,
    auto_play: true,
    quiz_group_id: valid.interaction.quizGroupId,
    quiz_group_title: valid.interaction.quizGroupTitle,
  };
  if (valid.content.instruction) screen.body_text = valid.content.instruction;

  return {
    version: 1,
    kind: "lessonplayer-games-pack",
    format: "flashcards",
    quiz_group_id: valid.interaction.quizGroupId,
    quiz_group_title: valid.interaction.quizGroupTitle,
    activity_name: valid.name,
    screens: [screen],
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
