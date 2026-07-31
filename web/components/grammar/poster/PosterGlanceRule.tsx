"use client";

import { clsx } from "clsx";
import { posterInlineEditFieldKey } from "@/lib/grammar-builder/editor/poster-inline-edit-fields";
import { PosterEditableText } from "./editor/PosterEditableText";
import { usePosterInlineEdit } from "./editor/PosterInlineEditContext";
import { posterAlignClass } from "./PosterGraphic";

type Props = {
  cardId?: number;
  text: string;
  highlight?: string;
  align?: "left" | "center" | "right";
};

function highlightText(text: string, highlight?: string) {
  if (!highlight || !text.includes(highlight)) {
    return text;
  }
  const [before, after] = text.split(highlight);
  return (
    <>
      {before}
      <strong className="font-extrabold">{highlight}</strong>
      {after}
    </>
  );
}

export function PosterGlanceRule({ cardId, text, highlight, align = "center" }: Props) {
  const inlineEdit = usePosterInlineEdit();
  const showHighlightEditor =
    cardId != null &&
    inlineEdit?.enabled &&
    inlineEdit.selectedCardId === cardId;

  const glanceRuleBody = (
    <span className="text-balance text-xl font-extrabold leading-snug text-kid-ink md:text-2xl">
      {highlightText(text, highlight)}
    </span>
  );

  return (
    <div className={clsx("mb-2", posterAlignClass(align))}>
      {cardId != null ?
        <PosterEditableText
          cardId={cardId}
          fieldKey={posterInlineEditFieldKey(cardId, { kind: "chrome", field: "glanceRuleText" })}
          value={text}
          variant="glance-rule"
          maxLength={60}
          placeholder="Glance rule"
        >
          {glanceRuleBody}
        </PosterEditableText>
      : glanceRuleBody}

      {showHighlightEditor ?
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-kid-ink/45">
            Highlight
          </span>
          <PosterEditableText
            cardId={cardId}
            fieldKey={posterInlineEditFieldKey(cardId, {
              kind: "chrome",
              field: "glanceRuleHighlight",
            })}
            value={highlight ?? ""}
            variant="glance-highlight"
            placeholder="Word to bold"
          >
            <span className="text-xs font-bold uppercase tracking-wide text-kid-ink/55">
              {highlight || "None"}
            </span>
          </PosterEditableText>
        </div>
      : null}
    </div>
  );
}
