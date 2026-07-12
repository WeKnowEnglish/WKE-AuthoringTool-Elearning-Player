"use client";

import { posterInlineEditFieldKey } from "@/lib/grammar-builder/editor/poster-inline-edit-fields";
import { PosterEditableText } from "./editor/PosterEditableText";
import { usePosterInlineEdit } from "./editor/PosterInlineEditContext";
import { PosterInteractiveTarget } from "./interactions/PosterInteractiveTarget";

import { getSectionPillColor } from "./poster-section-colors";

import type { PosterMiniCard } from "./poster-view-model";

import type { GrammarPosterVariant } from "./poster-variant";

type Props = {
  cardId: number;
  miniCards: PosterMiniCard[];
  variant?: GrammarPosterVariant;
};

export function PosterFourCardGridBody({ cardId, miniCards, variant = "poster" }: Props) {
  const inlineEdit = usePosterInlineEdit();
  const showFormulaEditor = (index: number, formula?: string) =>
    !!formula || (inlineEdit?.enabled && inlineEdit.selectedCardId === cardId);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
      {miniCards.map((mini, index) => (
        <PosterInteractiveTarget key={`${mini.title}-${index}`} cardId={cardId} region="miniCard" itemIndex={index}>
          <div
            className="rounded-xl border-2 border-dashed border-kid-ink/35 bg-white/60 p-2 sm:p-3"
            style={{ backgroundColor: `${getSectionPillColor(mini.color, mini.palette)}55` }}
          >
            <PosterEditableText
              cardId={cardId}
              fieldKey={posterInlineEditFieldKey(cardId, {
                kind: "miniCard",
                index,
                prop: "badge",
              })}
              value={mini.badge ?? ""}
              variant="emoji"
              placeholder="🏷️"
              trimOnCommit={false}
            >
              {mini.badge ? (
                <span className="mr-1 text-base" aria-hidden>
                  {mini.badge}
                </span>
              ) : null}
            </PosterEditableText>
            <p
              className={
                variant === "poster" ?
                  "text-xs font-extrabold uppercase text-kid-ink md:text-sm"
                : "text-[11px] font-extrabold uppercase text-kid-ink"
              }
            >
              <PosterEditableText
                cardId={cardId}
                fieldKey={posterInlineEditFieldKey(cardId, {
                  kind: "miniCard",
                  index,
                  prop: "title",
                })}
                value={mini.title}
                variant="column-title"
                placeholder="Title"
              >
                <span>{mini.title}</span>
              </PosterEditableText>
            </p>
            <p
              className={
                variant === "poster" ?
                  "mt-1 text-sm font-bold leading-tight text-kid-ink md:text-base"
                : "mt-1 text-[11px] font-bold leading-tight text-kid-ink"
              }
            >
              <PosterEditableText
                cardId={cardId}
                fieldKey={posterInlineEditFieldKey(cardId, {
                  kind: "miniCard",
                  index,
                  prop: "rule",
                })}
                value={mini.rule}
                variant="example-sentence"
                placeholder="Rule"
              >
                <span>{mini.rule}</span>
              </PosterEditableText>
            </p>
            {showFormulaEditor(index, mini.formula) ? (
              <p className="mt-1 font-mono text-xs font-extrabold text-kid-ink md:text-sm">
                <PosterEditableText
                  cardId={cardId}
                  fieldKey={posterInlineEditFieldKey(cardId, {
                    kind: "miniCard",
                    index,
                    prop: "formula",
                  })}
                  value={mini.formula ?? ""}
                  variant="formula-mono"
                  placeholder="Formula"
                >
                  <span>{mini.formula || "Formula (optional)"}</span>
                </PosterEditableText>
              </p>
            ) : null}
          </div>
        </PosterInteractiveTarget>
      ))}
    </div>
  );
}
