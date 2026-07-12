"use client";

import { posterInlineEditFieldKey } from "@/lib/grammar-builder/editor/poster-inline-edit-fields";
import { PosterEditableText } from "./editor/PosterEditableText";
import { usePosterInlineEdit } from "./editor/PosterInlineEditContext";
import type { GrammarPosterVariant } from "./poster-variant";

type Props = {
  cardId: number;
  label: string;
  badge?: string;
  desc?: string;
  extra?: string;
  pillColor: string;
  variant?: GrammarPosterVariant;
};

export function PosterSubHeader({
  cardId,
  label,
  badge,
  desc,
  extra,
  pillColor,
  variant = "poster",
}: Props) {
  const isShowcase = variant === "showcase";
  const inlineEdit = usePosterInlineEdit();
  const showOptional =
    inlineEdit?.enabled && inlineEdit.selectedCardId === cardId;

  return (
    <div className="mb-3 space-y-2">
      <div
        className={
          isShowcase ?
            "flex items-center justify-center gap-2 rounded-full border-2 border-kid-ink px-3 py-1.5 text-center text-sm font-extrabold uppercase tracking-wide text-kid-ink shadow-[2px_2px_0_0_var(--kid-shadow)]"
          : "flex items-center justify-center gap-2 rounded-full border-2 border-kid-ink px-4 py-2 text-center text-base font-bold uppercase tracking-wide text-kid-ink shadow-[2px_2px_0_0_var(--kid-shadow)]"
        }
        style={{ backgroundColor: pillColor }}
      >
        {badge || showOptional ?
          <PosterEditableText
            cardId={cardId}
            fieldKey={posterInlineEditFieldKey(cardId, { kind: "subHeader", field: "badge" })}
            value={badge ?? ""}
            variant="emoji"
            placeholder="🏷️"
            trimOnCommit={false}
          >
            <span className={isShowcase ? "text-lg" : "text-2xl"} aria-hidden>
              {badge}
            </span>
          </PosterEditableText>
        : null}
        <PosterEditableText
          cardId={cardId}
          fieldKey={posterInlineEditFieldKey(cardId, { kind: "subHeader", field: "label" })}
          value={label}
          variant="column-title"
          placeholder="Sub-header label"
        >
          <span>{label}</span>
        </PosterEditableText>
      </div>
      {desc || showOptional ?
        <p className="text-base font-semibold leading-snug text-kid-ink md:text-lg">
          <PosterEditableText
            cardId={cardId}
            fieldKey={posterInlineEditFieldKey(cardId, { kind: "subHeader", field: "desc" })}
            value={desc ?? ""}
            variant="body-text"
            placeholder="Description"
          >
            <span>{desc || (showOptional ? "Description (optional)" : "")}</span>
          </PosterEditableText>
        </p>
      : null}
      {extra || showOptional ?
        <p className="text-sm font-semibold text-kid-ink/70 md:text-base">
          <PosterEditableText
            cardId={cardId}
            fieldKey={posterInlineEditFieldKey(cardId, { kind: "subHeader", field: "extra" })}
            value={extra ?? ""}
            variant="caption"
            placeholder="Extra note"
          >
            <span>{extra || (showOptional ? "Extra note (optional)" : "")}</span>
          </PosterEditableText>
        </p>
      : null}
    </div>
  );
}
