"use client";

import {
  posterExampleFieldKey,
  type PosterColumnSide,
} from "@/lib/grammar-builder/editor/poster-inline-edit-fields";
import { PosterEditableText } from "./PosterEditableText";
import { usePosterInlineEdit } from "./PosterInlineEditContext";

type ExampleRegion = "item" | PosterColumnSide;

type Props = {
  cardId: number;
  region: ExampleRegion;
  itemIndex: number;
  sentence: string;
  highlight?: string;
  emoji: string;
  label?: string;
  layout: "row" | "stack";
  sentenceClassName: string;
  emojiBoxClassName: string;
  labelClassName?: string;
};

function highlightSentence(sentence: string, highlight?: string) {
  if (!highlight || !sentence.includes(highlight)) {
    return sentence;
  }
  const [before, after] = sentence.split(highlight);
  return (
    <>
      {before}
      <strong className="font-extrabold text-kid-ink">{highlight}</strong>
      {after}
    </>
  );
}

function HighlightEditor({
  cardId,
  region,
  itemIndex,
  highlight,
}: {
  cardId: number;
  region: ExampleRegion;
  itemIndex: number;
  highlight?: string;
}) {
  const inlineEdit = usePosterInlineEdit();
  if (!inlineEdit?.enabled || inlineEdit.selectedCardId !== cardId) {
    return null;
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-bold uppercase tracking-wide text-kid-ink/45">
        Highlight
      </span>
      <PosterEditableText
        cardId={cardId}
        fieldKey={posterExampleFieldKey(cardId, region, itemIndex, "highlight")}
        value={highlight ?? ""}
        variant="example-highlight"
        placeholder="Word to bold"
      >
        <span className="text-xs font-bold uppercase tracking-wide text-kid-ink/55">
          {highlight || "None"}
        </span>
      </PosterEditableText>
    </div>
  );
}

export function PosterEditableExampleFields({
  cardId,
  region,
  itemIndex,
  sentence,
  highlight,
  emoji,
  label,
  layout,
  sentenceClassName,
  emojiBoxClassName,
  labelClassName,
}: Props) {
  const inlineEdit = usePosterInlineEdit();
  const showCaptionEditor =
    inlineEdit?.enabled && inlineEdit.selectedCardId === cardId;

  const sentenceEditor = (
    <>
      <PosterEditableText
        cardId={cardId}
        fieldKey={posterExampleFieldKey(cardId, region, itemIndex, "text")}
        value={sentence}
        variant="example-sentence"
        placeholder="Example sentence"
      >
        <span className={sentenceClassName}>{highlightSentence(sentence, highlight)}</span>
      </PosterEditableText>
      <HighlightEditor
        cardId={cardId}
        region={region}
        itemIndex={itemIndex}
        highlight={highlight}
      />
    </>
  );

  const emojiEditor = (
    <PosterEditableText
      cardId={cardId}
      fieldKey={posterExampleFieldKey(cardId, region, itemIndex, "graphic")}
      value={emoji}
      variant="emoji"
      placeholder="📘"
      trimOnCommit={false}
    >
      <div className={emojiBoxClassName} aria-hidden>
        {emoji}
      </div>
    </PosterEditableText>
  );

  const captionEditor =
    label || showCaptionEditor ?
      <PosterEditableText
        cardId={cardId}
        fieldKey={posterExampleFieldKey(cardId, region, itemIndex, "caption")}
        value={label ?? ""}
        variant="caption"
        placeholder="Caption"
      >
        <span className={labelClassName ?? "text-sm font-semibold text-kid-ink/70"}>
          {label || (showCaptionEditor ? "Caption (optional)" : "")}
        </span>
      </PosterEditableText>
    : null;

  if (layout === "stack") {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 py-1.5 text-center">
        {emojiEditor}
        {sentenceEditor}
        {captionEditor}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <div className="flex shrink-0 flex-col items-center gap-0.5">
        {emojiEditor}
        {captionEditor}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">{sentenceEditor}</div>
    </div>
  );
}
