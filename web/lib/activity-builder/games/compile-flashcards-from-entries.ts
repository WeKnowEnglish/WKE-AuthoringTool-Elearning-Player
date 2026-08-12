import type {
  GamesFlashcardCard,
  GamesFlashcardFace,
  GamesFlashcardsAuthoringDocument,
} from "@/lib/activity-builder/games/types-flashcards";
import { GAMES_FLASHCARD_FACES } from "@/lib/activity-builder/games/types-flashcards";
import type {
  VocabListEntry,
  VocabularyListDocument,
} from "@/lib/activity-builder/vocabulary-list/types";
import { validateGamesFlashcardsAuthoringDocument } from "@/lib/activity-builder/games/flashcards";

function slugifyId(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "games-flashcards"
  );
}

export type FlashcardsCompileSkipped = {
  entryId: string;
  word: string;
  reason: string;
};

export type FlashcardsFaceLayout = {
  frontFaces: GamesFlashcardFace[];
  backFaces: GamesFlashcardFace[];
};

export type FlashcardsCompileOptions = {
  shuffleCards?: boolean;
};

/** Picture on front; word + example on back. */
export const DEFAULT_FLASHCARDS_FACE_LAYOUT: FlashcardsFaceLayout = {
  frontFaces: ["picture"],
  backFaces: ["word", "example"],
};

function availableFacesForEntry(entry: {
  word: string;
  definition: string;
  example: string;
  pictureUrl: string;
}): GamesFlashcardFace[] {
  const faces: GamesFlashcardFace[] = [];
  if (entry.word) faces.push("word");
  if (entry.definition) faces.push("definition");
  if (entry.example) faces.push("example");
  if (entry.pictureUrl) faces.push("picture");
  return faces;
}

/**
 * Apply preferred front/back faces to what the entry actually has.
 * Front wins on overlap; empty sides steal from leftovers / the other side.
 */
export function resolveFlashcardFacesForEntry(
  preferred: FlashcardsFaceLayout,
  available: GamesFlashcardFace[],
): { frontFaces: GamesFlashcardFace[]; backFaces: GamesFlashcardFace[] } | null {
  const availableSet = new Set(available);
  if (availableSet.size < 2) return null;

  const preferredFront = preferred.frontFaces.filter((face) => availableSet.has(face));
  const preferredBack = preferred.backFaces.filter(
    (face) => availableSet.has(face) && !preferredFront.includes(face),
  );

  const frontFaces = [...preferredFront];
  const backFaces = [...preferredBack];
  const used = new Set<GamesFlashcardFace>([...frontFaces, ...backFaces]);
  const leftover = available.filter((face) => !used.has(face));

  if (frontFaces.length < 1 && leftover.length > 0) {
    frontFaces.push(leftover.shift()!);
  }
  if (backFaces.length < 1 && leftover.length > 0) {
    backFaces.push(...leftover);
    leftover.length = 0;
  }
  if (frontFaces.length < 1 && backFaces.length > 1) {
    frontFaces.push(backFaces.shift()!);
  }
  if (backFaces.length < 1 && frontFaces.length > 1) {
    backFaces.push(frontFaces.pop()!);
  }

  if (frontFaces.length < 1 || backFaces.length < 1) return null;

  const order = (faces: GamesFlashcardFace[]) =>
    GAMES_FLASHCARD_FACES.filter((face) => faces.includes(face));

  return {
    frontFaces: order(frontFaces),
    backFaces: order(backFaces),
  };
}

/**
 * Compile a flashcard deck from vocabulary list entries.
 * Defaults: picture on front; word + example on back (per available fields).
 */
export function compileFlashcardsFromEntries(
  list: VocabularyListDocument,
  entries: VocabListEntry[],
  layout: FlashcardsFaceLayout = DEFAULT_FLASHCARDS_FACE_LAYOUT,
  options: FlashcardsCompileOptions = {},
): {
  document: GamesFlashcardsAuthoringDocument;
  skipped: FlashcardsCompileSkipped[];
} {
  const preferred: FlashcardsFaceLayout = {
    frontFaces:
      layout.frontFaces.length > 0
        ? layout.frontFaces
        : DEFAULT_FLASHCARDS_FACE_LAYOUT.frontFaces,
    backFaces:
      layout.backFaces.length > 0
        ? layout.backFaces
        : DEFAULT_FLASHCARDS_FACE_LAYOUT.backFaces,
  };
  const shuffleCards = options.shuffleCards !== false;

  const skipped: FlashcardsCompileSkipped[] = [];
  const cards: GamesFlashcardCard[] = [];

  for (const [index, entry] of entries.entries()) {
    const word = entry.word.trim().replace(/\s+/g, " ");
    if (!word) {
      skipped.push({
        entryId: entry.id,
        word: entry.word,
        reason: "Word is empty.",
      });
      continue;
    }

    const definition = entry.definitionEn?.trim() || "";
    const example = entry.example?.trim() || "";
    const pictureUrl = entry.imageUrl?.trim() || "";
    const available = availableFacesForEntry({
      word,
      definition,
      example,
      pictureUrl,
    });
    const faces = resolveFlashcardFacesForEntry(preferred, available);
    if (!faces) {
      skipped.push({
        entryId: entry.id,
        word,
        reason:
          "Need enough content for both card sides (e.g. picture + word, or word + example).",
      });
      continue;
    }

    const card: GamesFlashcardCard = {
      id: `c${index + 1}`,
      faces: {
        word,
        ...(definition ? { definition } : {}),
        ...(example ? { example } : {}),
        ...(pictureUrl ? { pictureUrl } : {}),
      },
      frontFaces: faces.frontFaces,
      backFaces: faces.backFaces,
    };
    if (entry.audioUrl?.trim()) {
      card.promptAudioUrl = entry.audioUrl.trim();
    }
    if (entry.exampleAudioUrl?.trim()) {
      card.exampleAudioUrl = entry.exampleAudioUrl.trim();
    }
    if (entry.definitionAudioUrl?.trim()) {
      card.definitionAudioUrl = entry.definitionAudioUrl.trim();
    }
    cards.push(card);
  }

  if (cards.length < 1) {
    throw new Error(
      "Flashcards need at least one word with enough content for both card sides.",
    );
  }

  const vocabulary = cards.map((card) => card.faces.word!).filter(Boolean);
  const name = `${list.name.trim() || "Vocabulary"} · Flashcards`;
  const quizGroupId = slugifyId(name);

  const document: GamesFlashcardsAuthoringDocument = {
    version: 1,
    kind: "activity-authoring",
    id: quizGroupId,
    name,
    educationalIntent: {
      objective: `Study vocabulary with flip flashcards: ${vocabulary.join(", ")}.`,
      successCriteria: "Students flip through each card front and back.",
      vocabulary: [...vocabulary],
      ...(list.cefr ? { cefr: list.cefr } : {}),
    },
    content: {
      instruction: "Tap the card to flip. Study each word.",
      completionMessage: "Nice studying!",
    },
    interaction: {
      type: "games",
      format: "flashcards",
      quizGroupId,
      quizGroupTitle: name,
      shuffleCardsDefault: shuffleCards,
      defaultFrontFaces: [...preferred.frontFaces],
      defaultBackFaces: [...preferred.backFaces],
      cards,
    },
  };

  return {
    document: validateGamesFlashcardsAuthoringDocument(document),
    skipped,
  };
}
