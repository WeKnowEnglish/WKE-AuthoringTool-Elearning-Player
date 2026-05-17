/** Shared vocabulary practice UI tokens (learn / T/F / drag / cloze). */

export const VOCAB_STAGE_BACKGROUND = "#dbeafe";

export const VOCAB_WORD_CHIP_BG = "#ffffff";
export const VOCAB_WORD_CHIP_BORDER = "#152668";
export const VOCAB_WORD_CHIP_TEXT = "#0f172a";

/** Tap target for word-bank / drag labels on the blue stage. */
export const vocabWordChipButtonClass =
  "touch-manipulation rounded-lg border-2 border-[#152668] bg-white px-3 py-2.5 text-base font-bold text-[#0f172a] shadow-[2px_2px_0_#152668] transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50";

/** Larger chips for cloze word bank (easier to read at a glance). */
export const vocabWordChipButtonLargeClass =
  "touch-manipulation rounded-xl border-2 border-[#152668] bg-white px-4 py-3 text-xl font-bold text-[#0f172a] shadow-[2px_2px_0_#152668] transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:px-5 sm:py-3.5 sm:text-2xl";

/** Letter tile on vocab spell answer row and tray. */
export const vocabLetterTileClass =
  "box-border flex h-full w-full min-h-0 min-w-0 touch-manipulation select-none items-center justify-center overflow-hidden rounded-xl border-2 border-[#152668] bg-white font-bold leading-none text-[#0f172a] shadow-[2px_2px_0_#152668] transition-[transform,background-color] duration-100 [touch-action:manipulation] hover:bg-sky-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:active:scale-100";

/** Empty slot outline on vocab spell answer row. */
export const vocabLetterSlotClass =
  "flex shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-[#152668]/40 bg-white/80 p-0.5";
