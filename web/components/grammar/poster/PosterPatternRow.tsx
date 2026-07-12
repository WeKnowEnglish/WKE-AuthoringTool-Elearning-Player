"use client";

import { posterInlineEditFieldKey } from "@/lib/grammar-builder/editor/poster-inline-edit-fields";
import { PosterEditableText } from "./editor/PosterEditableText";
import { usePosterInlineEdit } from "./editor/PosterInlineEditContext";
import type { PosterPattern } from "./poster-view-model";
import type { GrammarPosterVariant } from "./poster-variant";

type Props = {
  cardId: number;
  patternIndex: number;
  pattern: PosterPattern;
  variant?: GrammarPosterVariant;
};

export function PosterPatternRow({ cardId, patternIndex, pattern, variant = "poster" }: Props) {
  const isShowcase = variant === "showcase";
  const inlineEdit = usePosterInlineEdit();
  const showGraphic =
    !!pattern.emoji || (inlineEdit?.enabled && inlineEdit.selectedCardId === cardId);

  return (
    <div className="rounded-xl border-2 border-kid-ink/20 bg-white/70 p-3 shadow-sm">
      <p
        className={
          isShowcase ?
            "mb-1 text-xs font-extrabold uppercase tracking-wide text-kid-ink/60"
          : "mb-1 text-sm font-extrabold uppercase tracking-wide text-kid-ink/60"
        }
      >
        <PosterEditableText
          cardId={cardId}
          fieldKey={posterInlineEditFieldKey(cardId, {
            kind: "pattern",
            index: patternIndex,
            prop: "label",
          })}
          value={pattern.label}
          variant="caption"
          placeholder="Pattern label"
        >
          <span>{pattern.label}</span>
        </PosterEditableText>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <p
          className={
            isShowcase ?
              "flex-1 font-mono text-sm font-bold leading-snug text-kid-ink sm:text-base"
            : "flex-1 font-mono text-base font-bold leading-snug text-kid-ink"
          }
        >
          <PosterEditableText
            cardId={cardId}
            fieldKey={posterInlineEditFieldKey(cardId, {
              kind: "pattern",
              index: patternIndex,
              prop: "formula",
            })}
            value={pattern.formula}
            variant="formula-mono"
            placeholder="Pattern formula"
          >
            <span>{pattern.formula}</span>
          </PosterEditableText>
        </p>
        {showGraphic ?
          <PosterEditableText
            cardId={cardId}
            fieldKey={posterInlineEditFieldKey(cardId, {
              kind: "pattern",
              index: patternIndex,
              prop: "graphic",
            })}
            value={pattern.emoji ?? ""}
            variant="emoji"
            placeholder="🙂"
            trimOnCommit={false}
          >
            <span className={isShowcase ? "text-2xl" : "text-3xl"} aria-hidden>
              {pattern.emoji || "🙂"}
            </span>
          </PosterEditableText>
        : null}
      </div>
    </div>
  );
}
