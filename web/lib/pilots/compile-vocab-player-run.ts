/**
 * Compile a frozen Vocabulary Player run: sample 6 image-ready words → fixed quiz spine.
 * Theme banks keep full word lists; only words with real images enter the quiz.
 */
import { buildQuizPacksFromVocabList } from "@/lib/activity-library/compile-quizzes-from-vocab-studio";
import { pickDistractors } from "@/lib/activity-builder/games/pick-distractors";
import type { VocabListEntry, VocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/types";
import type { ScreenPayload } from "@/lib/lesson-schemas";
import type { LessonScreenRow } from "@/lib/lesson/types";
import { pickNWithSeed, shuffleWithSeed } from "@/lib/vocabulary-templates/shuffle";
import {
  VOCAB_PLAYER_LESSON_ID_PREFIX,
  VOCAB_PLAYER_SAMPLE_SIZE,
  expectedVocabPlayerScreenCount,
} from "@/lib/pilots/compile-vocab-player-run-constants";
import {
  buildVocabPlayerPoolDocument,
  buildVocabPlayerThemePool,
  filterImageReadyEntries,
  type VocabPlayerThemeId,
} from "@/lib/pilots/vocab-player-pool";

export {
  VOCAB_PLAYER_LESSON_ID_PREFIX,
  VOCAB_PLAYER_SAMPLE_SIZE,
  expectedVocabPlayerScreenCount,
} from "@/lib/pilots/compile-vocab-player-run-constants";

export type VocabPlayerPhaseId =
  | "flashcards"
  | "letter_mixup"
  | "line_match"
  | "mc_quiz"
  | "listen_and_choose";

export type VocabPlayerCompiledRun = {
  seed: string;
  lessonId: string;
  quizGroupId: string;
  themeId?: VocabPlayerThemeId;
  /** Full themed bank (may include words still missing images). */
  bankEntries: VocabListEntry[];
  /** Image-ready words actually used in this quiz run. */
  entries: VocabListEntry[];
  screens: LessonScreenRow[];
  phaseStarts: Record<VocabPlayerPhaseId, number>;
  imageUrls: string[];
  practiceWords: Array<{ id: string; lemma: string; imageUrl: string }>;
};

function asPackScreens(pack: unknown): ScreenPayload[] {
  if (!pack || typeof pack !== "object") return [];
  const screens = (pack as { screens?: unknown }).screens;
  if (!Array.isArray(screens)) return [];
  return screens as ScreenPayload[];
}

/** Stamp vocab word id (+ optional auto-advance) onto interaction screens by order. */
function stampVocabScreens(
  screens: ScreenPayload[],
  entries: VocabListEntry[],
  options?: { autoAdvance?: boolean },
): ScreenPayload[] {
  return screens.map((screen, index) => {
    const entry = entries[index];
    if (!entry || screen.type !== "interaction") return screen;
    return {
      ...screen,
      vocab_word_id: entry.id,
      ...(options?.autoAdvance ? { auto_advance_on_pass: true as const } : {}),
    };
  });
}

function vocabImageUrl(entry: VocabListEntry): string {
  return (
    entry.imageUrl?.trim() ||
    `https://placehold.co/400x400/e2e8f0/334155?text=${encodeURIComponent(entry.word)}`
  );
}

function buildLineMatchScreen(
  entries: VocabListEntry[],
  quizGroupId: string,
  seed: string,
): ScreenPayload {
  const tokens = entries.map((entry) => ({
    id: `tok_${entry.id}`,
    label: entry.word,
  }));
  const zones = shuffleWithSeed(
    entries.map((entry) => ({
      id: `z_${entry.id}`,
      image_url: vocabImageUrl(entry),
      label: entry.word,
    })),
    `${seed}:drag-match-zones`,
  );
  const correct_map = Object.fromEntries(
    entries.map((entry) => [`tok_${entry.id}`, `z_${entry.id}`]),
  );
  return {
    type: "interaction",
    subtype: "line_match",
    body_text: "Draw a line from each word to its picture.",
    image_fit: "contain",
    tokens,
    zones,
    correct_map,
    quiz_group_id: quizGroupId,
    quiz_group_title: "Vocabulary match",
    quiz_group_order: 0,
  };
}

function buildListenAndChooseScreens(
  entries: VocabListEntry[],
  quizGroupId: string,
): ScreenPayload[] {
  const words = entries.map((e) => e.word);
  const byWord = new Map(entries.map((e) => [e.word.toLowerCase(), e]));

  return entries.map((entry, order) => {
    const distractorWords = pickDistractors(entry.word, words, 2, { stable: false });
    const choiceEntries: VocabListEntry[] = [
      entry,
      ...distractorWords.map((word) => {
        const found = byWord.get(word.toLowerCase());
        if (found) return found;
        return {
          id: `pad_${word}`,
          word,
          imageUrl: `https://placehold.co/400x400/e2e8f0/334155?text=${encodeURIComponent(word)}`,
        } satisfies VocabListEntry;
      }),
    ];

    const choices = choiceEntries.map((choice, index) => ({
      id: String.fromCharCode(97 + index),
      image_url:
        choice.imageUrl?.trim() ||
        `https://placehold.co/400x400/e2e8f0/334155?text=${encodeURIComponent(choice.word)}`,
      label: choice.word,
    }));

    const correct = choices.find((c) => c.label.toLowerCase() === entry.word.toLowerCase());
    return {
      type: "interaction",
      subtype: "listen_and_choose",
      body_text: "Listen, then choose the picture.",
      dialog_text: entry.example?.trim() || entry.word,
      prompt_audio_url: entry.audioUrl?.trim() || undefined,
      image_fit: "contain" as const,
      auto_play: true,
      shuffle_choices: true,
      choices,
      correct_choice_id: correct?.id ?? "a",
      vocab_word_id: entry.id,
      quiz_group_id: quizGroupId,
      quiz_group_title: "Listen and choose",
      quiz_group_order: order,
    };
  });
}

function collectImageUrls(screens: ScreenPayload[], entries: VocabListEntry[]): string[] {
  const urls = new Set<string>();
  for (const entry of entries) {
    if (entry.imageUrl?.trim()) urls.add(entry.imageUrl.trim());
  }
  for (const screen of screens) {
    if (screen.type !== "interaction") continue;
    const raw = screen as Record<string, unknown>;
    if (typeof raw.image_url === "string" && raw.image_url.trim()) {
      urls.add(raw.image_url.trim());
    }
    if (Array.isArray(raw.choices)) {
      for (const choice of raw.choices) {
        if (
          choice &&
          typeof choice === "object" &&
          typeof (choice as { image_url?: unknown }).image_url === "string"
        ) {
          const u = (choice as { image_url: string }).image_url.trim();
          if (u) urls.add(u);
        }
      }
    }
    if (Array.isArray(raw.cards)) {
      for (const card of raw.cards) {
        if (!card || typeof card !== "object") continue;
        const faces = (card as { faces?: unknown }).faces;
        if (!Array.isArray(faces)) continue;
        for (const face of faces) {
          if (
            face &&
            typeof face === "object" &&
            typeof (face as { image_url?: unknown }).image_url === "string"
          ) {
            const u = (face as { image_url: string }).image_url.trim();
            if (u) urls.add(u);
          }
        }
      }
    }
  }
  return [...urls];
}

function toRows(
  lessonId: string,
  screens: ScreenPayload[],
  idPrefix: string,
): LessonScreenRow[] {
  return screens.map((payload, index) => ({
    id: `${idPrefix}-${index}`,
    lesson_id: lessonId,
    order_index: index,
    screen_type: "interaction",
    payload,
  }));
}

function entryMatchesPreferredId(entry: VocabListEntry, preferredId: string): boolean {
  if (entry.id === preferredId) return true;
  const bare = entry.id.includes(":") ? entry.id.slice(entry.id.lastIndexOf(":") + 1) : entry.id;
  return bare === preferredId;
}

/**
 * Prefer mastery / review word ids among image-ready entries, then fill randomly.
 * Mirrors Product A `buildVocabularyPracticeContext` preferred-first sampling.
 */
function pickImageReadySample(
  imageReady: VocabListEntry[],
  sampleSize: number,
  seed: string,
  preferredWordIds?: string[],
): VocabListEntry[] {
  const preferredOrder = (preferredWordIds ?? []).filter(Boolean);
  if (preferredOrder.length === 0) {
    return pickNWithSeed(imageReady, sampleSize, seed);
  }

  const preferred: VocabListEntry[] = [];
  const preferredSeen = new Set<string>();
  for (const id of preferredOrder) {
    const match = imageReady.find(
      (entry) => !preferredSeen.has(entry.id) && entryMatchesPreferredId(entry, id),
    );
    if (!match) continue;
    preferredSeen.add(match.id);
    preferred.push(match);
    if (preferred.length >= sampleSize) break;
  }

  const remaining = imageReady.filter((entry) => !preferredSeen.has(entry.id));
  const fill = pickNWithSeed(
    remaining,
    Math.max(0, sampleSize - preferred.length),
    `${seed}:practice`,
  );
  return [...preferred, ...fill];
}

/**
 * Sample image-ready words from a themed bank (or provided pool) and compile the full run.
 * Words without real images stay on the bank list but never enter the quiz.
 */
export function compileVocabPlayerRun(input?: {
  seed?: string;
  pool?: VocabularyListDocument;
  themeId?: VocabPlayerThemeId;
  sampleSize?: number;
  /** Prefer these word ids (bare or `set:word`) among image-ready entries. */
  preferredWordIds?: string[];
}): VocabPlayerCompiledRun {
  const seed = input?.seed?.trim() || `vp-${Date.now().toString(36)}`;
  const themeId = input?.themeId;
  const bank =
    input?.pool ??
    (themeId ? buildVocabPlayerThemePool(themeId) : buildVocabPlayerPoolDocument());
  const sampleSize = input?.sampleSize ?? VOCAB_PLAYER_SAMPLE_SIZE;
  const imageReady = filterImageReadyEntries(bank.entries);
  if (imageReady.length < sampleSize) {
    throw new Error(
      `This theme only has ${imageReady.length} words with pictures; need at least ${sampleSize}. Add images to unlock the quiz.`,
    );
  }
  const picked = pickImageReadySample(
    imageReady,
    sampleSize,
    seed,
    input?.preferredWordIds,
  );

  const list: VocabularyListDocument = {
    ...bank,
    id: `vocab-player-run-${seed}`,
    name: `Vocabulary run (${picked.map((e) => e.word).join(", ")})`,
    entries: picked,
  };

  const quizGroupId = `vocab-player-${seed}`;
  const lessonId = `${VOCAB_PLAYER_LESSON_ID_PREFIX}-${seed}`;

  const built = buildQuizPacksFromVocabList({
    list,
    formats: ["flashcards", "letter_mixup", "multiple_choice"],
    mcMasterQuestion: "What is this?",
    mcOptionCount: 4,
    flashcardsFrontFaces: ["picture"],
    flashcardsBackFaces: ["word", "example"],
  });

  const byFormat = new Map(built.packs.map((p) => [p.format, p]));
  const flashScreens = asPackScreens(byFormat.get("flashcards")?.pack);
  const letterScreens = stampVocabScreens(
    asPackScreens(byFormat.get("letter_mixup")?.pack),
    picked,
  );
  const mcScreens = stampVocabScreens(
    asPackScreens(byFormat.get("multiple_choice")?.pack),
    picked,
    { autoAdvance: true },
  );
  const matchScreens = [buildLineMatchScreen(picked, quizGroupId, seed)];
  const listenScreens = stampVocabScreens(
    buildListenAndChooseScreens(picked, quizGroupId),
    picked,
    { autoAdvance: true },
  );

  if (flashScreens.length === 0) {
    throw new Error("Flashcards compile produced no screens.");
  }
  if (letterScreens.length === 0) {
    throw new Error("Letter scramble compile produced no screens.");
  }
  if (mcScreens.length === 0) {
    throw new Error("MCQ compile produced no screens.");
  }

  const phaseStarts: Record<VocabPlayerPhaseId, number> = {
    flashcards: 0,
    letter_mixup: flashScreens.length,
    line_match: flashScreens.length + letterScreens.length,
    mc_quiz: flashScreens.length + letterScreens.length + matchScreens.length,
    listen_and_choose:
      flashScreens.length + letterScreens.length + matchScreens.length + mcScreens.length,
  };

  const allPayloads = [
    ...flashScreens,
    ...letterScreens,
    ...matchScreens,
    ...mcScreens,
    ...listenScreens,
  ];

  const screens = toRows(lessonId, allPayloads, `vp-${seed}`);

  return {
    seed,
    lessonId,
    quizGroupId,
    themeId,
    bankEntries: bank.entries,
    entries: picked,
    screens,
    phaseStarts,
    imageUrls: collectImageUrls(allPayloads, picked),
    practiceWords: picked.map((entry) => ({
      id: entry.id,
      lemma: entry.word,
      imageUrl: entry.imageUrl!.trim(),
    })),
  };
}
