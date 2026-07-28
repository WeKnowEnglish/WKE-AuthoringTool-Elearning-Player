"use client";

import clsx from "clsx";

type Props = {
  syllables: string[];
  activeIndex: number | null;
};

export function SecondaryWordSyllableDisplay({ syllables, activeIndex }: Props) {
  const parts = syllables.map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  return (
    <p
      className="mt-2 font-mono text-xl font-extrabold tracking-wide text-sec-ink"
      aria-live="polite"
    >
      {parts.map((syllable, index) => (
        <span key={`${syllable}-${index}`}>
          {index > 0 ? <span className="px-0.5 text-sec-ink/35">-</span> : null}
          <span
            className={clsx(
              "rounded px-1 transition-colors duration-150",
              activeIndex === index && "bg-sky-200 text-sky-950 secondary-syllable-speak-pulse",
            )}
          >
            {syllable}
          </span>
        </span>
      ))}
    </p>
  );
}
