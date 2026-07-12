"use client";

import { type CSSProperties } from "react";
import { posterInlineEditFieldKey } from "@/lib/grammar-builder/editor/poster-inline-edit-fields";
import { PosterEditableText } from "./editor/PosterEditableText";
import { usePosterInlineEdit } from "./editor/PosterInlineEditContext";
import type { PosterGoodBadPair as PosterGoodBadPairData } from "./poster-view-model";
import type { GrammarPosterVariant } from "./poster-variant";

type Props = {
  cardId: number;
  pair: PosterGoodBadPairData;
  variant?: GrammarPosterVariant;
  accentColor?: string;
};

function highlightSentence(sentence: string, highlight?: string) {
  if (!highlight || !sentence.includes(highlight)) {
    return sentence;
  }
  const [before, after] = sentence.split(highlight);
  return (
    <>
      {before}
      <strong className="font-extrabold">{highlight}</strong>
      {after}
    </>
  );
}

function GoodBadHighlightEditor({
  cardId,
  side,
  highlight,
}: {
  cardId: number;
  side: "good" | "bad";
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
        fieldKey={posterInlineEditFieldKey(cardId, {
          kind: "goodBad",
          side,
          prop: "highlight",
        })}
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

function GoodBadSide({
  cardId,
  side,
  label,
  labelStyle,
  labelClassName,
  sentenceClassName,
  data,
}: {
  cardId: number;
  side: "good" | "bad";
  label: string;
  labelStyle?: CSSProperties;
  labelClassName?: string;
  sentenceClassName: string;
  data: PosterGoodBadPairData["good"];
}) {
  return (
    <div className="rounded-xl border-2 border-dashed border-kid-ink/35 bg-white/60 p-3">
      <p
        className={`mb-1 text-xs font-extrabold uppercase ${labelClassName ?? ""}`}
        style={labelStyle}
      >
        {label}
      </p>
      <p className={sentenceClassName}>
        <PosterEditableText
          cardId={cardId}
          fieldKey={posterInlineEditFieldKey(cardId, {
            kind: "goodBad",
            side,
            prop: "graphic",
          })}
          value={data.emoji ?? ""}
          variant="emoji"
          placeholder={side === "good" ? "✓" : "✗"}
          trimOnCommit={false}
        >
          <span className="mr-1" aria-hidden>
            {data.emoji}
          </span>
        </PosterEditableText>
        <PosterEditableText
          cardId={cardId}
          fieldKey={posterInlineEditFieldKey(cardId, {
            kind: "goodBad",
            side,
            prop: "text",
          })}
          value={data.sentence}
          variant="example-sentence"
          placeholder="Example sentence"
        >
          <span>{highlightSentence(data.sentence, data.highlight)}</span>
        </PosterEditableText>
      </p>
      <GoodBadHighlightEditor cardId={cardId} side={side} highlight={data.highlight} />
    </div>
  );
}

export function PosterGoodBadPair({
  cardId,
  pair,
  variant = "poster",
  accentColor = "#1d4ed8",
}: Props) {
  const textClass =
    variant === "poster" ?
      "text-base font-semibold leading-relaxed md:text-lg"
    : "text-sm font-semibold leading-relaxed";

  return (
    <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <GoodBadSide
        cardId={cardId}
        side="good"
        label="Good"
        labelStyle={{ color: accentColor }}
        sentenceClassName={textClass}
        data={pair.good}
      />
      <GoodBadSide
        cardId={cardId}
        side="bad"
        label="Bad"
        labelClassName="text-kid-ink/60"
        sentenceClassName={`${textClass} text-kid-ink/60 line-through`}
        data={pair.bad}
      />
    </div>
  );
}
