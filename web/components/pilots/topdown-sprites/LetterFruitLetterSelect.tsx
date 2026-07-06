"use client";

import { clsx } from "clsx";
import { useLetterFruitSelector } from "@/components/pilots/topdown-sprites/LetterFruitSelectorContext";
import {
  LETTER_FRUIT_VARIANTS,
  type LetterFruitSlug,
} from "@/lib/topdown/letter-fruit-variants";

type Props = {
  className?: string;
  compact?: boolean;
};

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function slugForLetterButton(
  letter: string,
  currentSlug: LetterFruitSlug,
): LetterFruitSlug {
  if (letter === "J") {
    return currentSlug === "j_red" ? "j_red" : "j_green";
  }
  return letter.toLowerCase() as LetterFruitSlug;
}

export function LetterFruitLetterSelect({ className, compact = false }: Props) {
  const { slug, setSlug } = useLetterFruitSelector();
  const isJ = slug === "j_green" || slug === "j_red";

  function selectLetter(next: LetterFruitSlug) {
    setSlug(next);
  }

  if (compact) {
    return (
      <div className={clsx("flex flex-wrap items-center gap-2", className)}>
        <label className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/70">
          Letter
        </label>
        <select
          className="rounded-md border-2 border-kid-ink bg-white px-2 py-1 text-sm font-semibold text-kid-ink"
          value={slug}
          onChange={(e) => selectLetter(e.target.value as LetterFruitSlug)}
        >
          {LETTER_FRUIT_VARIANTS.map((variant) => (
            <option key={variant.slug} value={variant.slug}>
              {variant.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className={clsx("space-y-2", className)}>
      <p className="text-center text-xs font-bold uppercase tracking-wide text-kid-ink/60">
        Letter
      </p>
      <div className="flex flex-wrap justify-center gap-1">
        {ALPHABET.map((letter) => {
          const letterSlug = slugForLetterButton(letter, slug);
          const active = letter === "J" ? isJ : slug === letterSlug;
          return (
            <button
              key={letter}
              type="button"
              className={clsx(
                "min-w-[2rem] rounded-lg border-2 px-2 py-1 text-xs font-extrabold uppercase transition-colors",
                active
                  ? "border-kid-ink bg-[#f7bf4d] text-kid-ink"
                  : "border-kid-ink/25 bg-kid-panel text-kid-ink/70 hover:bg-kid-surface-muted",
              )}
              onClick={() => selectLetter(letterSlug)}
            >
              {letter}
            </button>
          );
        })}
      </div>
      {isJ ?
        <div className="flex justify-center gap-1.5">
          {(["j_green", "j_red"] as const).map((jSlug) => (
            <button
              key={jSlug}
              type="button"
              className={clsx(
                "rounded-lg border-2 px-2.5 py-1 text-xs font-bold transition-colors",
                slug === jSlug
                  ? "border-kid-ink bg-[#f7bf4d] text-kid-ink"
                  : "border-kid-ink/25 bg-kid-panel text-kid-ink/70 hover:bg-kid-surface-muted",
              )}
              onClick={() => selectLetter(jSlug)}
            >
              {jSlug === "j_green" ? "Green" : "Red"}
            </button>
          ))}
        </div>
      : null}
    </div>
  );
}
