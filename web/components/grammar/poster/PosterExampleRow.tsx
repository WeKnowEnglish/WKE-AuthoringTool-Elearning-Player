"use client";

import type { PosterExample } from "./poster-view-model";
import { isLabelOnlyText } from "@/lib/grammar-builder/poster-label";
import type { GrammarPosterVariant } from "./poster-variant";
import { PosterEditableExampleFields } from "./editor/PosterEditableExampleFields";
import { PosterInteractiveExample } from "./PosterInteractiveExample";

type Props = {
  example: PosterExample;
  variant?: GrammarPosterVariant;
  cardId?: number;
  region?: "leftColumn" | "rightColumn" | "item";
  itemIndex?: number;
};

export function PosterExampleRow({
  example,
  variant = "poster",
  cardId,
  region,
  itemIndex,
}: Props) {
  const isShowcase = variant === "showcase";
  const isLabelOnly = isLabelOnlyText(example.sentence);
  const canInlineEdit =
    cardId != null && region != null && itemIndex != null && !isShowcase;

  if (isLabelOnly) {
    const labelOnly = canInlineEdit ?
      <PosterEditableExampleFields
        cardId={cardId}
        region={region}
        itemIndex={itemIndex}
        sentence={example.sentence}
        highlight={example.highlight}
        emoji={example.emoji}
        label={example.label}
        layout="stack"
        sentenceClassName="text-2xl font-extrabold tracking-wide text-kid-ink text-center"
        emojiBoxClassName="text-5xl leading-none"
        labelClassName="text-sm font-semibold text-kid-ink/70"
      />
    : <div className="flex flex-col items-center justify-center gap-1.5 py-1.5 text-center">
        <span className="text-5xl leading-none" aria-hidden>
          {example.emoji}
        </span>
        <p className="text-2xl font-extrabold tracking-wide text-kid-ink">{example.sentence}</p>
        {example.label ?
          <p className="text-sm font-semibold text-kid-ink/70">{example.label}</p>
        : null}
      </div>;

    return (
      <PosterInteractiveExample
        example={labelOnly}
        cardId={cardId}
        region={region}
        itemIndex={itemIndex}
      />
    );
  }

  const row = canInlineEdit ?
    <div className="border-b border-dashed border-kid-ink/25 py-2 last:border-b-0">
      <PosterEditableExampleFields
        cardId={cardId}
        region={region}
        itemIndex={itemIndex}
        sentence={example.sentence}
        highlight={example.highlight}
        emoji={example.emoji}
        label={example.label}
        layout="row"
        sentenceClassName="text-lg font-semibold leading-snug text-kid-ink md:text-xl"
        emojiBoxClassName="flex h-20 w-20 min-h-20 min-w-20 items-center justify-center rounded-xl border-2 border-kid-ink bg-white text-4xl shadow-[2px_2px_0_0_var(--kid-shadow)]"
        labelClassName="text-sm font-bold uppercase text-kid-ink/60"
      />
    </div>
  : <div className="flex items-center gap-3 border-b border-dashed border-kid-ink/25 py-2 last:border-b-0 sm:gap-4">
      <div className="flex shrink-0 flex-col items-center gap-0.5">
        <div
          className="flex h-20 w-20 min-h-20 min-w-20 items-center justify-center rounded-xl border-2 border-kid-ink bg-white text-4xl shadow-[2px_2px_0_0_var(--kid-shadow)]"
          aria-hidden
        >
          {example.emoji}
        </div>
        {example.label ?
          <span className="text-sm font-bold uppercase text-kid-ink/60">{example.label}</span>
        : null}
      </div>
      <div className="flex min-w-0 flex-1 items-start">
        <p className="text-lg font-semibold leading-snug text-kid-ink md:text-xl">
          {example.sentence}
        </p>
      </div>
    </div>;

  return (
    <PosterInteractiveExample
      example={row}
      cardId={cardId}
      region={region}
      itemIndex={itemIndex}
    />
  );
}
