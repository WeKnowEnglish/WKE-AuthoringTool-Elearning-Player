import type { VocabWord } from "./types";
import {
  VOCAB_WORD_CHIP_TEXT,
  vocabWordChipButtonClass,
} from "./vocab-interaction-ui";
import { VOCAB_LEARN_PAGE_BACKGROUND } from "./vocab-learn-new-word";

/** @deprecated Use VOCAB_WORD_CHIP_BG from vocab-interaction-ui */
export { VOCAB_WORD_CHIP_BG as VOCAB_DRAG_LABEL_CARD_BG } from "./vocab-interaction-ui";
/** @deprecated Use VOCAB_WORD_CHIP_BORDER from vocab-interaction-ui */
export { VOCAB_WORD_CHIP_BORDER as VOCAB_DRAG_LABEL_CARD_BORDER } from "./vocab-interaction-ui";
/** @deprecated Use VOCAB_WORD_CHIP_TEXT from vocab-interaction-ui */
export { VOCAB_WORD_CHIP_TEXT as VOCAB_DRAG_LABEL_TEXT_COLOR } from "./vocab-interaction-ui";
export { vocabWordChipButtonClass };

export const VOCAB_DRAG_PAGE_ID = "drag-match";
export const VOCAB_DRAG_INTRO_PHASE_ID = "drag-intro";
export const VOCAB_DRAG_PLAY_PHASE_ID = "drag-play";
export const VOCAB_DRAG_DONE_PHASE_ID = "drag-done";

const DRAG_IMG_TOP = 8;
const DRAG_IMG_ROW_STEP = 32;
const DRAG_IMG_HEIGHT = 30;
const DRAG_LABEL_BANK_Y = 76;
const DRAG_LABEL_HEIGHT = 11;
const DRAG_STAGE_MARGIN_X = 6;
const DRAG_GRID_GAP_X = 2;
const DRAG_LABEL_BANK_GAP = 1.5;

/** Picture drop targets in a 3-column grid on the upper stage. */
export function layoutDragTarget(
  index: number,
  total: number,
): { x: number; y: number; w: number; h: number } {
  const cols = Math.min(3, Math.max(1, total));
  const col = index % cols;
  const row = Math.floor(index / cols);
  const usableW = 100 - DRAG_STAGE_MARGIN_X * 2;
  const cellW = (usableW - DRAG_GRID_GAP_X * (cols - 1)) / cols;
  return {
    x: DRAG_STAGE_MARGIN_X + col * (cellW + DRAG_GRID_GAP_X),
    y: DRAG_IMG_TOP + row * DRAG_IMG_ROW_STEP,
    w: cellW,
    h: DRAG_IMG_HEIGHT,
  };
}

/** Draggable word labels in a row along the bottom (separate from pictures). */
export function layoutDragLabel(
  index: number,
  total: number,
): { x: number; y: number; w: number; h: number } {
  const usableW = 100 - DRAG_STAGE_MARGIN_X * 2;
  const cellW = (usableW - DRAG_LABEL_BANK_GAP * (total - 1)) / total;
  return {
    x: DRAG_STAGE_MARGIN_X + index * (cellW + DRAG_LABEL_BANK_GAP),
    y: DRAG_LABEL_BANK_Y,
    w: cellW,
    h: DRAG_LABEL_HEIGHT,
  };
}

export function dragImageItemId(wordId: string): string {
  return `drag-${wordId}-img`;
}

export function dragTextItemId(wordId: string): string {
  return `drag-${wordId}-txt`;
}

/** Offset from image bottom to label top (stage %; negative = tuck up onto the image). */
export const VOCAB_DRAG_LABEL_STICK_GAP = -9.5;

/** Where a matched label sits: centered under the target image bottom edge. */
export function layoutDragLabelBelowTarget(
  target: { x_percent: number; y_percent: number; w_percent: number; h_percent: number },
  label: { w_percent: number; h_percent: number },
): { x: number; y: number; w: number; h: number } {
  const x =
    target.x_percent + Math.max(0, (target.w_percent - label.w_percent) / 2);
  return {
    x,
    y: target.y_percent + target.h_percent + VOCAB_DRAG_LABEL_STICK_GAP,
    w: label.w_percent,
    h: label.h_percent,
  };
}

export function isVocabDragMatchPage(page: { id?: string }): boolean {
  return page.id === VOCAB_DRAG_PAGE_ID;
}

/** True when every draggable label is assigned to its correct picture target. */
export function areVocabDragMatchesComplete(
  dragMatch: {
    draggable_item_ids: string[];
    correct_map: Record<string, string>;
  },
  assignments: Record<string, string>,
): boolean {
  return dragMatch.draggable_item_ids.every(
    (id) => assignments[id] === dragMatch.correct_map[id],
  );
}

export function isVocabDragTextItemId(itemId: string): boolean {
  return /^drag-.+-txt$/.test(itemId);
}

export function isVocabDragImageItemId(itemId: string): boolean {
  return /^drag-.+-img$/.test(itemId);
}

export function wordIdFromDragTextItemId(itemId: string): string | null {
  const m = /^drag-(.+)-txt$/.exec(itemId);
  return m?.[1] ?? null;
}

/** Story payload for word → picture drag match (practice words only). */
export function buildDragMatchStoryPayload(
  practiceWords: VocabWord[],
  options?: { autoAdvanceOnPass?: boolean },
): Record<string, unknown> {
  const total = practiceWords.length;
  const autoAdvance = options?.autoAdvanceOnPass ?? true;

  const imageItems = practiceWords.map((word, i) => {
    const { x, y, w, h } = layoutDragTarget(i, total);
    return {
      id: dragImageItemId(word.id),
      name: word.lemma,
      image_url: word.imageUrl,
      x_percent: x,
      y_percent: y,
      w_percent: w,
      h_percent: h,
      show_on_start: true,
      show_card: false,
      image_fit: "contain",
      z_index: 1,
    };
  });

  const textItems = practiceWords.map((word, i) => {
    const { x, y, w, h } = layoutDragLabel(i, total);
    return {
      id: dragTextItemId(word.id),
      kind: "text" as const,
      text: word.lemma,
      text_color: VOCAB_WORD_CHIP_TEXT,
      x_percent: x,
      y_percent: y,
      w_percent: w,
      h_percent: h,
      show_on_start: false,
      show_card: true,
      text_size_px: 20,
      z_index: 3,
      tap_speeches: [
        {
          id: `drag-${word.id}-speech`,
          priority: 0,
          text: word.tts ?? word.lemma,
          phase_ids: [VOCAB_DRAG_PLAY_PHASE_ID],
        },
      ],
    };
  });

  const correctMap = Object.fromEntries(
    practiceWords.map((w) => [dragTextItemId(w.id), dragImageItemId(w.id)]),
  );

  return {
    ...(autoAdvance ? { auto_advance_on_pass: true as const } : {}),
    type: "story",
    payload_version: 2,
    layout_mode: "slide",
    body_text: "",
    read_aloud_text: "Drag each word to the matching picture.",
    tts_lang: "en-US",
    pages: [
      {
        id: VOCAB_DRAG_PAGE_ID,
        title: "Match words to pictures",
        background_color: VOCAB_LEARN_PAGE_BACKGROUND,
        image_fit: "contain",
        items: [...imageItems, ...textItems],
        phases: [
          {
            id: VOCAB_DRAG_INTRO_PHASE_ID,
            name: "Intro",
            is_start: true,
            dialogue: { start: "Drag each word to the matching picture." },
            completion: {
              type: "auto",
              delay_ms: 2400,
              next_phase_id: VOCAB_DRAG_PLAY_PHASE_ID,
            },
          },
          {
            id: VOCAB_DRAG_PLAY_PHASE_ID,
            name: "Drag",
            is_start: false,
            kind: "drag_match",
            visible_item_ids: [
              ...practiceWords.flatMap((w) => [
                dragImageItemId(w.id),
                dragTextItemId(w.id),
              ]),
            ],
            on_enter: [
              {
                action: "show_item",
                item_ids: practiceWords.map((w) => dragTextItemId(w.id)),
              },
            ],
            drag_match: {
              draggable_item_ids: practiceWords.map((w) => dragTextItemId(w.id)),
              target_item_ids: practiceWords.map((w) => dragImageItemId(w.id)),
              correct_map: correctMap,
              after_correct_match: "stick_on_target",
            },
            completion: {
              type: "all_matched",
              next_phase_id: VOCAB_DRAG_DONE_PHASE_ID,
            },
          },
          {
            id: VOCAB_DRAG_DONE_PHASE_ID,
            name: "Done",
            completion: { type: "end_phase" },
            dialogue: { start: "Great matching!" },
          },
        ],
      },
    ],
    image_url: practiceWords[0]?.imageUrl,
    image_fit: "contain",
  };
}
