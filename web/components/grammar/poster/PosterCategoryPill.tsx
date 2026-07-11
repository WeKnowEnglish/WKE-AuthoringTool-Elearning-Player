"use client";

import { posterInlineEditFieldKey } from "@/lib/grammar-builder/editor/poster-inline-edit-fields";
import { PosterEditableText } from "./editor/PosterEditableText";
import { usePosterInlineEdit } from "./editor/PosterInlineEditContext";

type Props = {
  cardId: number;
  side: "leftColumn" | "rightColumn";
  label: string;
  emoji?: string;
  backgroundColor: string;
  variant?: "poster" | "showcase";
};

export function PosterCategoryPill({
  cardId,
  side,
  label,
  emoji,
  backgroundColor,
  variant = "poster",
}: Props) {
  const inlineEdit = usePosterInlineEdit();
  const isShowcase = variant === "showcase";
  const showBadgeEditor =
    inlineEdit?.enabled && inlineEdit.selectedCardId === cardId && !isShowcase;

  return (
    <div
      className={
        isShowcase ?
          "mb-4 flex items-center justify-center gap-2 rounded-full border-2 border-kid-ink px-4 py-2 text-center text-sm font-extrabold uppercase tracking-wide text-kid-ink shadow-[2px_2px_0_0_var(--kid-shadow)]"
        : "mb-2 flex items-center justify-center gap-2 rounded-full border-2 border-kid-ink px-4 py-2 text-center text-base font-bold uppercase tracking-wide text-kid-ink shadow-[2px_2px_0_0_var(--kid-shadow)]"
      }
      style={{ backgroundColor }}
    >
      {emoji || showBadgeEditor ?
        <PosterEditableText
          cardId={cardId}
          fieldKey={posterInlineEditFieldKey(cardId, { kind: "columnBadge", side })}
          value={emoji ?? ""}
          variant="emoji"
          placeholder="📘"
          trimOnCommit={false}
        >
          {emoji ?
            <span className={isShowcase ? "text-lg" : "text-2xl"} aria-hidden>
              {emoji}
            </span>
          : showBadgeEditor ?
            <span className="text-sm text-kid-ink/40">+</span>
          : null}
        </PosterEditableText>
      : null}
      <PosterEditableText
        cardId={cardId}
        fieldKey={posterInlineEditFieldKey(cardId, { kind: "columnTitle", side })}
        value={label}
        variant="column-title"
        placeholder="Column title"
      >
        <span>{label}</span>
      </PosterEditableText>
    </div>
  );
}
