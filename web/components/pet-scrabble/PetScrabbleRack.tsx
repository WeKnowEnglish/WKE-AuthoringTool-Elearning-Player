"use client";

import { clsx } from "clsx";
import Image from "next/image";
import { SCRABBLE_TILE_FACE_URL } from "@/lib/scrabble/scrabble-assets";

type Props = {
  rack: string[];
  stagingWord: string[];
  usedStagingIndices: Set<number>;
  onLetterClick: (index: number) => void;
  disabled?: boolean;
};

export function PetScrabbleRack({
  rack,
  stagingWord,
  usedStagingIndices,
  onLetterClick,
  disabled,
}: Props) {
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {rack.map((letter, index) => {
        const used = usedStagingIndices.has(index);
        return (
          <button
            key={`${letter}-${index}`}
            type="button"
            disabled={disabled || used}
            className={clsx(
              "relative h-9 w-8 shrink-0 sm:h-10 sm:w-9",
              "transition-transform [touch-action:manipulation] active:scale-95",
              used && "opacity-40",
              !used && !disabled && "hover:scale-105",
            )}
            onClick={() => onLetterClick(index)}
            aria-label={`Letter ${letter}`}
          >
            <Image
              src={SCRABBLE_TILE_FACE_URL}
              alt=""
              fill
              className="object-contain"
              sizes="36px"
            />
            <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-kid-ink">
              {letter}
            </span>
          </button>
        );
      })}
      {rack.length === 0 ?
        <p className="text-xs font-semibold text-kid-ink/60">Rack empty</p>
      : null}
      {stagingWord.length > 0 ?
        <p className="w-full text-center text-xs font-bold text-kid-ink">
          Word: {stagingWord.join("")}
        </p>
      : null}
    </div>
  );
}
