"use client";

import { type ReactNode } from "react";
import { posterInlineEditFieldKey } from "@/lib/grammar-builder/editor/poster-inline-edit-fields";
import { PosterEditableText } from "./editor/PosterEditableText";
import { usePosterInlineEdit } from "./editor/PosterInlineEditContext";
import type { PosterTransformationRow as PosterTransformationRowData } from "./poster-view-model";
import type { GrammarPosterVariant } from "./poster-variant";

type Props = {
  cardId?: number;
  itemIndex?: number;
  row: PosterTransformationRowData;
  variant?: GrammarPosterVariant;
};

type TransformField = "from" | "operator" | "suffix" | "to" | "graphic" | "ipa";

function TransformSegment({
  cardId,
  itemIndex,
  field,
  value,
  children,
}: {
  cardId?: number;
  itemIndex?: number;
  field: TransformField;
  value: string;
  children: ReactNode;
}) {
  if (cardId == null || itemIndex == null) {
    return <>{children}</>;
  }

  return (
    <PosterEditableText
      cardId={cardId}
      fieldKey={posterInlineEditFieldKey(cardId, {
        kind: "transformation",
        itemIndex,
        field,
      })}
      value={value}
      variant={field === "graphic" ? "emoji" : field === "ipa" ? "caption" : "example-sentence"}
      placeholder={field}
      trimOnCommit={field !== "graphic"}
    >
      {children}
    </PosterEditableText>
  );
}

export function PosterTransformationRow({
  cardId,
  itemIndex,
  row,
  variant = "poster",
}: Props) {
  const inlineEdit = usePosterInlineEdit();
  const textClass =
    variant === "poster" ?
      "text-base font-bold text-kid-ink md:text-lg"
    : "text-sm font-bold text-kid-ink";
  const showIpa =
    !!row.ipa || (cardId != null && inlineEdit?.enabled && inlineEdit.selectedCardId === cardId);

  return (
    <div className="mt-2 text-center">
      <p className={textClass}>
        <TransformSegment cardId={cardId} itemIndex={itemIndex} field="graphic" value={row.emoji ?? ""}>
          {row.emoji ? (
            <span className="mr-1" aria-hidden>
              {row.emoji}
            </span>
          ) : null}
        </TransformSegment>
        <TransformSegment cardId={cardId} itemIndex={itemIndex} field="from" value={row.from}>
          <span>{row.from}</span>
        </TransformSegment>
        <span className="mx-1">
          <TransformSegment cardId={cardId} itemIndex={itemIndex} field="operator" value={row.operator}>
            <span>{row.operator}</span>
          </TransformSegment>
        </span>
        <TransformSegment cardId={cardId} itemIndex={itemIndex} field="suffix" value={row.suffix}>
          <span>{row.suffix}</span>
        </TransformSegment>
        <span className="mx-1">=</span>
        <TransformSegment cardId={cardId} itemIndex={itemIndex} field="to" value={row.to}>
          <span>{row.to}</span>
        </TransformSegment>
      </p>
      {showIpa ?
        <p className="mt-1 text-sm font-semibold text-kid-ink/70 md:text-base">
          <TransformSegment cardId={cardId} itemIndex={itemIndex} field="ipa" value={row.ipa ?? ""}>
            <span>{row.ipa}</span>
          </TransformSegment>
        </p>
      : null}
    </div>
  );
}
