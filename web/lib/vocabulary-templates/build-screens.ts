import type { LessonScreenRow } from "@/lib/data/catalog";
import { buildDefaultOpeningStartPayload } from "@/lib/lesson-bookends";
import { pickNWithSeed, shuffleWithSeed } from "./shuffle";
import {
  buildVocabTrueFalseStatement,
  TF_GROUP_TITLE,
  type VocabTfBuildResult,
} from "./vocab-tf-statements";
import { buildVocabFillBlanksPayload } from "./vocab-cloze";
import { buildVocabLetterMixupPayload } from "./vocab-spell";
import { buildDragMatchStoryPayload } from "./vocab-drag-match";
import {
  VOCAB_LEARN_BTN_ID,
  VOCAB_LEARN_DONE_PHASE_ID,
  VOCAB_LEARN_INTRO_PHASE_ID,
  VOCAB_LEARN_PAGE_ID,
  VOCAB_LEARN_PLAY_PHASE_ID,
  VOCAB_LEARN_PAGE_BACKGROUND,
  VOCAB_LEARN_SPOTLIGHT,
  layoutLearnBorderSlot,
} from "./vocab-learn-new-word";
import {
  DEFAULT_PRACTICE_COUNT,
  type BuildVocabularySetOptions,
  type VocabWord,
  type VocabularySetDefinition,
} from "./types";

export type VocabularyBuildContext = {
  seed: string;
  practiceWords: VocabWord[];
};

const GROUP_TF_WORD = "vocab-tf-word";
/** Student player advances ~650ms after pass (see LessonPlayer). */
const VOCAB_AUTO_ADVANCE = { auto_advance_on_pass: true as const };

/** Words shown on the learn (click-to-reveal) screen. */
export function wordsForLearnScreen(def: VocabularySetDefinition): VocabWord[] {
  const exclude = new Set(def.learnExcludeWordIds ?? []);
  if (exclude.size === 0) return def.words;
  return def.words.filter((w) => !exclude.has(w.id));
}

/** Words used in practice sections for this run. */
export function buildVocabularyPracticeContext(
  def: VocabularySetDefinition,
  options?: BuildVocabularySetOptions,
): VocabularyBuildContext {
  const seed = options?.seed?.trim() || def.id;
  const practiceCount = options?.practiceCount ?? DEFAULT_PRACTICE_COUNT;
  const practiceWords = pickNWithSeed(def.words, practiceCount, `${seed}:practice`);
  return { seed, practiceWords };
}

/** Cloze, spell, and drag use this order (distinct from T/F screen order). */
export function practiceWordsInSessionOrder(ctx: VocabularyBuildContext): VocabWord[] {
  return shuffleWithSeed(ctx.practiceWords, `${ctx.seed}:practice-order`);
}

function syntheticScreenId(setId: string, orderIndex: number): string {
  return `vocab-${setId}-${orderIndex}`;
}

function toLessonScreenRow(
  setId: string,
  orderIndex: number,
  screenType: string,
  payload: unknown,
): LessonScreenRow {
  return {
    id: syntheticScreenId(setId, orderIndex),
    lesson_id: `vocab-${setId}`,
    order_index: orderIndex,
    screen_type: screenType,
    payload,
  };
}

/** Learn screen using the vocabulary spotlight reveal pattern (see `vocab-learn-new-word.ts`). */
function buildLearnStoryPayload(def: VocabularySetDefinition): Record<string, unknown> {
  const learnWords = wordsForLearnScreen(def);
  const items: Record<string, unknown>[] = [];
  const slotItemIds: string[] = [];
  const wordCount = learnWords.length;

  for (let i = 0; i < wordCount; i++) {
    const word = learnWords[i]!;
    const { x, y, w, h } = layoutLearnBorderSlot(i, wordCount);
    const imgId = `learn-${word.id}-img`;
    const slotId = `learn-${word.id}-slot`;
    slotItemIds.push(slotId);

    // Border shadow: same asset as spotlight, dark blue CSS silhouette (opaque pixels only; needs PNG alpha).
    items.push({
      id: slotId,
      name: `${word.lemma} shadow`,
      image_url: word.imageUrl,
      x_percent: x,
      y_percent: y,
      w_percent: w,
      h_percent: h,
      show_on_start: true,
      show_card: false,
      image_fit: "contain",
      z_index: 1,
    });
    // KEY DISPLAY: spotlight image — one per word, shared center frame, no card (see vocab-learn-new-word.ts).
    items.push({
      id: imgId,
      name: word.lemma,
      image_url: word.imageUrl,
      x_percent: VOCAB_LEARN_SPOTLIGHT.x,
      y_percent: VOCAB_LEARN_SPOTLIGHT.y,
      w_percent: VOCAB_LEARN_SPOTLIGHT.w,
      h_percent: VOCAB_LEARN_SPOTLIGHT.h,
      show_on_start: false,
      show_card: false,
      z_index: 25,
      tap_speeches: [
        { id: `learn-${word.id}-speech`, priority: 0, text: word.tts ?? word.lemma },
      ],
    });
  }

  items.push({
    id: VOCAB_LEARN_BTN_ID,
    name: "New word",
    kind: "button",
    text: "New word",
    x_percent: 34,
    y_percent: 82,
    w_percent: 32,
    h_percent: 9,
    show_on_start: false,
    show_card: false,
    z_index: 30,
    color_hex: "#f7bf4d",
    text_color: "#0f172a",
    text_size_px: 20,
  });

  return {
    ...VOCAB_AUTO_ADVANCE,
    type: "story",
    payload_version: 2,
    layout_mode: "slide",
    body_text: "",
    read_aloud_text: `Learn ${def.title}. Press New word for each picture.`,
    tts_lang: "en-US",
    pages: [
      {
        id: VOCAB_LEARN_PAGE_ID,
        title: "Learn the words",
        background_color: VOCAB_LEARN_PAGE_BACKGROUND,
        image_fit: "contain",
        items,
        phases: [
          {
            id: VOCAB_LEARN_INTRO_PHASE_ID,
            name: "Intro",
            is_start: true,
            visible_item_ids: slotItemIds,
            dialogue: { start: "Look around the border. Get ready!" },
            completion: {
              type: "auto",
              delay_ms: 2400,
              next_phase_id: VOCAB_LEARN_PLAY_PHASE_ID,
            },
          },
          {
            id: VOCAB_LEARN_PLAY_PHASE_ID,
            name: "New word",
            is_start: false,
            visible_item_ids: [...slotItemIds, VOCAB_LEARN_BTN_ID],
            highlight_item_ids: [VOCAB_LEARN_BTN_ID],
            dialogue: { start: "Press New word." },
          },
          {
            id: VOCAB_LEARN_DONE_PHASE_ID,
            name: "Done",
            dialogue: { start: "Nice arranging!" },
            completion: { type: "end_phase" },
          },
        ],
      },
    ],
    image_url: def.coverImageUrl,
    image_fit: "contain",
  };
}

function buildTrueFalsePayload(
  built: VocabTfBuildResult,
  wordId: string,
  groupId: string,
  groupTitle: string,
  groupOrder: number,
): Record<string, unknown> {
  return {
    ...VOCAB_AUTO_ADVANCE,
    type: "interaction",
    subtype: "true_false",
    vocab_word_id: wordId,
    image_url: built.imageUrl,
    image_fit: "contain",
    statement: built.statement,
    correct: built.correct,
    picture_truth_statement: built.pictureTruthStatement,
    quiz_group_id: groupId,
    quiz_group_title: groupTitle,
    quiz_group_order: groupOrder,
  };
}

function buildWordToPictureScreensFixed(
  setId: string,
  def: VocabularySetDefinition,
  ctx: VocabularyBuildContext,
  startOrder: number,
): LessonScreenRow[] {
  const ordered = shuffleWithSeed(ctx.practiceWords, `${ctx.seed}:tf-word-order`);
  return ordered.map((word, i) => {
    const built = buildVocabTrueFalseStatement(def, word, ctx.seed);
    return toLessonScreenRow(
      setId,
      startOrder + i,
      "interaction",
      buildTrueFalsePayload(built, word.id, GROUP_TF_WORD, TF_GROUP_TITLE, i),
    );
  });
}

/**
 * Materialize a vocabulary set into lesson player screens.
 */
export function buildVocabularySetScreens(
  def: VocabularySetDefinition,
  options?: BuildVocabularySetOptions,
): LessonScreenRow[] {
  const ctx = buildVocabularyPracticeContext(def, options);
  const practiceOrdered = practiceWordsInSessionOrder(ctx);
  const rows: LessonScreenRow[] = [];
  let order = 0;

  const opening = buildDefaultOpeningStartPayload(def.title);
  opening.image_url = def.coverImageUrl;
  opening.image_fit = "cover";
  rows.push(toLessonScreenRow(def.id, order++, "start", opening));

  rows.push(toLessonScreenRow(def.id, order++, "story", buildLearnStoryPayload(def)));

  rows.push(
    ...buildWordToPictureScreensFixed(def.id, def, ctx, order),
  );
  order += ctx.practiceWords.length;

  rows.push(
    toLessonScreenRow(
      def.id,
      order++,
      "story",
      buildDragMatchStoryPayload(practiceOrdered, { autoAdvanceOnPass: true }),
    ),
  );

  for (let i = 0; i < practiceOrdered.length; i++) {
    rows.push(
      toLessonScreenRow(
        def.id,
        order++,
        "interaction",
        buildVocabFillBlanksPayload(practiceOrdered[i]!, ctx, i),
      ),
    );
  }

  for (let i = 0; i < practiceOrdered.length; i++) {
    rows.push(
      toLessonScreenRow(
        def.id,
        order++,
        "interaction",
        buildVocabLetterMixupPayload(practiceOrdered[i]!, ctx.seed, i),
      ),
    );
  }

  return rows;
}
