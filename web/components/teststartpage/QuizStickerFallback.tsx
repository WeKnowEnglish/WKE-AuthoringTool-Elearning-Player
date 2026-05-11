"use client";

import { clsx } from "clsx";
import type { QuizStickerVisual } from "@/lib/teststartpage/quiz-question-sticker";
import { STICKER_CARD_RING, STICKER_RARITY_LABEL_CLASS } from "@/lib/progress/sticker-library";

/**
 * Picture area for quick-quiz questions with no media library image — same card treatment as the sticker book.
 */
export function QuizStickerFallback({ sticker }: { sticker: QuizStickerVisual }) {
  return (
    <div
      className="relative mx-auto mb-3 w-full max-w-4xl overflow-hidden rounded-lg border-4 border-kid-ink bg-[#fffdf8]"
      style={{ aspectRatio: "16 / 9" }}
      role="img"
      aria-label={`Picture: ${sticker.label} sticker`}
    >
      <div className="flex h-full min-h-[10rem] w-full flex-col items-center justify-center gap-1 p-4 sm:p-6">
        <div
          className={clsx(
            "flex w-full max-w-md flex-col items-center justify-center rounded-2xl border-4 px-6 py-5 sm:px-8 sm:py-7",
            STICKER_CARD_RING[sticker.rarity],
          )}
        >
          <span
            className="select-none text-[clamp(3rem,14vmin,6.5rem)] leading-none"
            aria-hidden
          >
            {sticker.emoji}
          </span>
          <p className="mt-3 text-center text-base font-extrabold text-kid-ink sm:text-lg">{sticker.label}</p>
          <p
            className={clsx(
              "text-[11px] font-extrabold uppercase tracking-[0.14em] sm:text-xs",
              STICKER_RARITY_LABEL_CLASS[sticker.rarity],
            )}
          >
            {sticker.rarity}
          </p>
        </div>
      </div>
    </div>
  );
}
