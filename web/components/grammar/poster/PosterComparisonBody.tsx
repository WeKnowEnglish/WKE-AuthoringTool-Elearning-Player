"use client";

import { posterInlineEditFieldKey, posterExampleFieldKey } from "@/lib/grammar-builder/editor/poster-inline-edit-fields";
import { PosterEditableText } from "./editor/PosterEditableText";
import { usePosterInlineEdit } from "./editor/PosterInlineEditContext";
import { PosterInteractiveTarget } from "./interactions/PosterInteractiveTarget";
import type { PosterComparisonSide } from "./poster-view-model";
import type { GrammarPosterVariant } from "./poster-variant";

type Props = {
  cardId: number;
  left: PosterComparisonSide;
  right: PosterComparisonSide;
  variant?: GrammarPosterVariant;
};

function HighlightEditorCompact({
  cardId,
  region,
  itemIndex,
  highlight,
}: {
  cardId: number;
  region: "leftColumn" | "rightColumn";
  itemIndex: number;
  highlight?: string;
}) {
  const inlineEdit = usePosterInlineEdit();
  if (!inlineEdit?.enabled || inlineEdit.selectedCardId !== cardId) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
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

function ComparisonColumn({
  cardId,
  side,
  region,
  variant,
  bordered,
}: {
  cardId: number;
  side: PosterComparisonSide;
  region: "leftColumn" | "rightColumn";
  variant: GrammarPosterVariant;
  bordered?: boolean;
}) {
  const titleClass =
    variant === "poster" ?
      "mb-2 text-xs font-extrabold uppercase text-kid-ink md:text-sm"
    : "mb-2 text-xs font-extrabold uppercase text-kid-ink";

  const itemClass =
    variant === "poster" ?
      "text-base font-bold text-kid-ink md:text-lg"
    : "text-xs font-bold text-kid-ink";

  return (
    <PosterInteractiveTarget cardId={cardId} region={region}>
      <div className={bordered ? "sm:border-r-2 sm:border-dashed sm:border-kid-ink/30 sm:pr-4" : "sm:pl-1"}>
        <p className={titleClass}>
          {side.badge ?
            <PosterEditableText
              cardId={cardId}
              fieldKey={posterInlineEditFieldKey(cardId, { kind: "columnBadge", side: region })}
              value={side.badge}
              variant="emoji"
              placeholder="✓"
              trimOnCommit={false}
            >
              <span className="mr-1" aria-hidden>
                {side.badge}
              </span>
            </PosterEditableText>
          : null}
          <PosterEditableText
            cardId={cardId}
            fieldKey={posterInlineEditFieldKey(cardId, { kind: "columnTitle", side: region })}
            value={side.title}
            variant="column-title"
            placeholder="Column title"
          >
            <span>{side.title}</span>
          </PosterEditableText>
        </p>
        {side.items.map((item, index) => (
          <PosterInteractiveTarget
            key={index}
            cardId={cardId}
            region={region}
            itemIndex={index}
          >
            {variant === "poster" ?
              <div className="mb-3 space-y-1">
                <div className={`${itemClass} flex flex-wrap items-center gap-1`}>
                  <PosterEditableText
                    cardId={cardId}
                    fieldKey={posterInlineEditFieldKey(cardId, {
                      kind: "columnItem",
                      side: region,
                      index,
                      prop: "graphic",
                    })}
                    value={item.emoji}
                    variant="emoji"
                    placeholder="📘"
                    trimOnCommit={false}
                  >
                    <span className="mr-1" aria-hidden>
                      {item.emoji}{" "}
                    </span>
                  </PosterEditableText>
                  <PosterEditableText
                    cardId={cardId}
                    fieldKey={posterInlineEditFieldKey(cardId, {
                      kind: "columnItem",
                      side: region,
                      index,
                      prop: "text",
                    })}
                    value={item.sentence}
                    variant="example-sentence"
                    placeholder="Example"
                  >
                    <span>{item.sentence}</span>
                  </PosterEditableText>
                </div>
                <HighlightEditorCompact
                  cardId={cardId}
                  region={region}
                  itemIndex={index}
                  highlight={item.highlight}
                />
              </div>
            : <p className={itemClass}>
                {item.emoji ?
                  <span aria-hidden>{item.emoji} </span>
                : null}
                {item.sentence}
              </p>
            }
          </PosterInteractiveTarget>
        ))}
      </div>
    </PosterInteractiveTarget>
  );
}

export function PosterComparisonBody({ cardId, left, right, variant = "poster" }: Props) {
  return (
    <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
      <ComparisonColumn
        cardId={cardId}
        side={left}
        region="leftColumn"
        variant={variant}
        bordered
      />
      <ComparisonColumn
        cardId={cardId}
        side={right}
        region="rightColumn"
        variant={variant}
      />
    </div>
  );
}
