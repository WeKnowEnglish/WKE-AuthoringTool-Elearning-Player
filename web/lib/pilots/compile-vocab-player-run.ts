/**
 * Compile a frozen Vocabulary Player run: sample 6 words → fixed quiz spine.
 * All screens are built up-front (no per-question fetch).
 */
import { buildQuizPacksFromVocabList } from "@/lib/activity-library/compile-quizzes-from-vocab-studio";
import { pickDistractors } from "@/lib/activity-builder/games/pick-distractors";
import type { VocabListEntry, VocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/types";
import type { ScreenPayload } from "@/lib/lesson-schemas";
import type { LessonScreenRow } from "@/lib/lesson/types";
import { pickNWithSeed } from "@/lib/vocabulary-templates/shuffle";
import { buildVocabPlayerPoolDocument } from "@/lib/pilots/vocab-player-pool";

export const VOCAB_PLAYER_SAMPLE_SIZE = 6;
export const VOCAB_PLAYER_LESSON_ID_PREFIX = "vocab-player";

export type VocabPlayerPhaseId =
  | "flashcards"
  | "letter_mixup"
  | "drag_match"
  | "mc_quiz"
  | "listen_and_choose";

export type VocabPlayerCompiledRun = {
  seed: string;
  lessonId: string;
  quizGroupId: string;
  entries: VocabListEntry[];
  screens: LessonScreenRow[];
  phaseStarts: Record<VocabPlayerPhaseId, number>;
  imageUrls: string[];
  practiceWords: Array<{ id: string; lemma: string }>;
};

function asPackScreens(pack: unknown): ScreenPayload[] {
  if (!pack || typeof pack !== "object") return [];
  const screens = (pack as { screens?: unknown }).screens;
  if (!Array.isArray(screens)) return [];
  return screens as ScreenPayload[];
}

function shortGloss(entry: VocabListEntry): string {
  const def = entry.definitionEn?.trim();
  if (def && def.length <= 48) return def;
  if (def) return `${def.slice(0, 45)}…`;
  const ex = entry.example?.trim();
  if (ex && ex.length <= 48) return ex;
  if (ex) return `${ex.slice(0, 45)}…`;
  return entry.word;
}

function buildDragMatchScreen(
  entries: VocabListEntry[],
  quizGroupId: string,
): ScreenPayload {
  const tokens = entries.map((entry) => ({
    id: `tok_${entry.id}`,
    label: entry.word,
  }));
  const zones = entries.map((entry) => ({
    id: `z_${entry.id}`,
    label: shortGloss(entry),
  }));
  const correct_map = Object.fromEntries(
    entries.map((entry) => [`tok_${entry.id}`, `z_${entry.id}`]),
  );
  return {
    type: "interaction",
    subtype: "drag_match",
    body_text: "Match each word to its meaning.",
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

/**
 * Sample 6 words from the pool (or provided list) and compile the full run.
 */
export function compileVocabPlayerRun(input?: {
  seed?: string;
  pool?: VocabularyListDocument;
  sampleSize?: number;
}): VocabPlayerCompiledRun {
  const seed = input?.seed?.trim() || `vp-${Date.now().toString(36)}`;
  const pool = input?.pool ?? buildVocabPlayerPoolDocument();
  const sampleSize = input?.sampleSize ?? VOCAB_PLAYER_SAMPLE_SIZE;
  const picked = pickNWithSeed(pool.entries, sampleSize, seed);
  if (picked.length < sampleSize) {
    throw new Error(
      `Vocabulary pool only has ${picked.length} words; need at least ${sampleSize}.`,
    );
  }

  const list: VocabularyListDocument = {
    ...pool,
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
  const letterScreens = asPackScreens(byFormat.get("letter_mixup")?.pack);
  const mcScreens = asPackScreens(byFormat.get("multiple_choice")?.pack);
  const dragScreens = [buildDragMatchScreen(picked, quizGroupId)];
  const listenScreens = buildListenAndChooseScreens(picked, quizGroupId);

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
    drag_match: flashScreens.length + letterScreens.length,
    mc_quiz: flashScreens.length + letterScreens.length + dragScreens.length,
    listen_and_choose:
      flashScreens.length + letterScreens.length + dragScreens.length + mcScreens.length,
  };

  const allPayloads = [
    ...flashScreens,
    ...letterScreens,
    ...dragScreens,
    ...mcScreens,
    ...listenScreens,
  ];

  const screens = toRows(lessonId, allPayloads, `vp-${seed}`);

  return {
    seed,
    lessonId,
    quizGroupId,
    entries: picked,
    screens,
    phaseStarts,
    imageUrls: collectImageUrls(allPayloads, picked),
    practiceWords: picked.map((entry) => ({ id: entry.id, lemma: entry.word })),
  };
}
