"use client";

import { clsx } from "clsx";
import type { PosterExample } from "./poster-view-model";
import { isLabelOnlyText } from "@/lib/grammar-builder/poster-label";
import type { GrammarPosterVariant } from "./poster-variant";
import { PosterEditableExampleFields } from "./editor/PosterEditableExampleFields";
import { PosterInteractiveExample } from "./PosterInteractiveExample";
import {
  PosterGraphic,
  posterAlignClass,
  posterAlignItemsClass,
  posterJustifyClass,
} from "./PosterGraphic";

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
  const align = example.align ?? "center";
  const alignText = posterAlignClass(align);
  const alignItems = posterAlignItemsClass(align);
  const justify = posterJustifyClass(align);

  if (isLabelOnly) {
    const labelOnly = canInlineEdit ?
      <PosterEditableExampleFields
        cardId={cardId}
        region={region}
        itemIndex={itemIndex}
        sentence={example.sentence}
        highlight={example.highlight}
        emoji={example.emoji}
        imageUrl={example.imageUrl}
        label={example.label}
        align={align}
        layout="stack"
        sentenceClassName={clsx(
          "text-2xl font-extrabold tracking-wide text-kid-ink",
          alignText,
        )}
        emojiBoxClassName="text-5xl leading-none"
        labelClassName="text-sm font-semibold text-kid-ink/70"
      />
    : <div
        className={clsx(
          "flex flex-col justify-center gap-1.5 py-1.5",
          alignItems,
          alignText,
        )}
      >
        <span className="text-5xl leading-none" aria-hidden>
          <PosterGraphic emoji={example.emoji} imageUrl={example.imageUrl} />
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
        imageUrl={example.imageUrl}
        label={example.label}
        align={align}
        layout="row"
        sentenceClassName={clsx(
          "text-lg font-semibold leading-snug text-kid-ink md:text-xl",
          alignText,
        )}
        emojiBoxClassName="flex h-20 w-20 min-h-20 min-w-20 items-center justify-center rounded-xl border-2 border-kid-ink bg-white text-4xl shadow-[2px_2px_0_0_var(--kid-shadow)]"
        labelClassName="text-sm font-bold uppercase text-kid-ink/60"
      />
    </div>
  : <div
      className={clsx(
        "flex items-center gap-3 border-b border-dashed border-kid-ink/25 py-2 last:border-b-0 sm:gap-4",
        justify,
      )}
    >
      <div className={clsx("flex shrink-0 flex-col gap-0.5", alignItems)}>
        <div
          className="flex h-20 w-20 min-h-20 min-w-20 items-center justify-center rounded-xl border-2 border-kid-ink bg-white text-4xl shadow-[2px_2px_0_0_var(--kid-shadow)]"
          aria-hidden
        >
          <PosterGraphic
            emoji={example.emoji}
            imageUrl={example.imageUrl}
            imgClassName="h-14 w-14"
          />
        </div>
        {example.label ?
          <span className="text-sm font-bold uppercase text-kid-ink/60">{example.label}</span>
        : null}
      </div>
      <div className={clsx("flex min-w-0 flex-1 items-start", justify)}>
        <p
          className={clsx(
            "text-lg font-semibold leading-snug text-kid-ink md:text-xl",
            alignText,
          )}
        >
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
