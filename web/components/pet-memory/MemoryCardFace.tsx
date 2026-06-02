"use client";

import { clsx } from "clsx";
import Image from "next/image";
import type { MemoryCard } from "@/lib/memory/memory-cards";
import {
  MEMORY_CARD_PICTURE_BG_URL,
  MEMORY_CARD_WORD_BG_URL,
} from "@/lib/memory/memory-assets";

type Props = {
  card: MemoryCard;
  animate?: boolean;
};

export function MemoryCardFace({ card, animate }: Props) {
  const isWord = card.face === "word";
  const bg = isWord ? MEMORY_CARD_WORD_BG_URL : MEMORY_CARD_PICTURE_BG_URL;

  return (
    <div
      className={clsx(
        "relative h-full w-full",
        animate && "pet-memory-card-flip",
      )}
    >
      <Image src={bg} alt="" fill className="object-cover" sizes="64px" />
      {isWord ?
        <span className="absolute inset-0 flex items-center justify-center px-0.5 text-center text-[0.6rem] font-black leading-tight text-kid-ink sm:text-xs">
          {card.word}
        </span>
      : <span
          className="absolute inset-0 flex items-center justify-center text-2xl sm:text-3xl"
          aria-hidden
        >
          {card.emoji}
        </span>
      }
    </div>
  );
}
