"use client";

import { clsx } from "clsx";
import Image from "next/image";
import { MemoryCardFace } from "@/components/pet-memory/MemoryCardFace";
import { MEMORY_CARD_BACK_URL } from "@/lib/memory/memory-assets";
import type { CardState } from "@/lib/memory/memory-session";
import type { MemoryCard } from "@/lib/memory/memory-cards";

type Props = {
  cards: MemoryCard[];
  states: CardState[];
  disabled?: boolean;
  highlightIndices?: number[];
  onCardClick: (index: number) => void;
};

export function MemoryCardGrid({
  cards,
  states,
  disabled,
  highlightIndices = [],
  onCardClick,
}: Props) {
  return (
    <div className="mx-auto grid w-full max-w-[min(100%,20rem)] grid-cols-4 gap-1.5 sm:gap-2">
      {cards.map((card, index) => {
        const state = states[index] ?? "down";
        const faceUp = state === "up" || state === "matched";
        const matched = state === "matched";
        const highlighted = highlightIndices.includes(index);

        return (
          <button
            key={card.id}
            type="button"
            disabled={disabled || state !== "down"}
            className={clsx(
              "relative aspect-[48/56] w-full overflow-hidden rounded-md border-2 border-kid-ink/25 shadow-sm",
              "transition-transform [touch-action:manipulation]",
              !disabled && state === "down" && "hover:scale-[1.02] active:scale-95",
              matched && "border-emerald-600 pet-memory-card-matched",
              highlighted && "ring-2 ring-violet-500 ring-offset-1",
              disabled && "cursor-default",
            )}
            onClick={() => onCardClick(index)}
            aria-label={
              faceUp ?
                `${card.face === "word" ? "Word" : "Picture"}: ${card.word}`
              : "Hidden card"
            }
          >
            {faceUp ?
              <MemoryCardFace card={card} animate={state === "up"} />
            : <Image
                src={MEMORY_CARD_BACK_URL}
                alt=""
                fill
                className="object-cover"
                sizes="64px"
              />
            }
          </button>
        );
      })}
    </div>
  );
}
