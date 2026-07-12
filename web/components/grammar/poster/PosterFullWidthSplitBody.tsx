"use client";

import { posterInlineEditFieldKey } from "@/lib/grammar-builder/editor/poster-inline-edit-fields";
import { PosterEditableText } from "./editor/PosterEditableText";
import { usePosterInlineEdit } from "./editor/PosterInlineEditContext";
import { PosterNoteBox } from "./PosterNoteBox";
import { PosterPatternRow } from "./PosterPatternRow";
import type { PosterSection } from "./poster-view-model";
import type { GrammarPosterVariant } from "./poster-variant";

type Props = {
  section: PosterSection;
  variant?: GrammarPosterVariant;
};

export function PosterFullWidthSplitBody({ section, variant = "poster" }: Props) {
  const leftPanel = section.leftPanel;
  const rightPanel = section.rightPanel;
  const inlineEdit = usePosterInlineEdit();

  if (!leftPanel || !rightPanel) {
    return null;
  }

  const cardId = section.number;
  const showOptional =
    inlineEdit?.enabled && inlineEdit.selectedCardId === cardId;
  const rightHighlight = rightPanel.warning ?? rightPanel.formula ?? rightPanel.body;

  return (
    <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        {leftPanel.title || showOptional ?
          <h3 className="text-base font-extrabold uppercase text-kid-ink md:text-lg">
            <PosterEditableText
              cardId={cardId}
              fieldKey={posterInlineEditFieldKey(cardId, {
                kind: "sidePanel",
                panel: "leftSide",
                field: "title",
              })}
              value={leftPanel.title ?? ""}
              variant="column-title"
              placeholder="Left title"
            >
              <span>{leftPanel.title}</span>
            </PosterEditableText>
          </h3>
        : null}
        <p className="text-base font-semibold leading-relaxed text-kid-ink md:text-lg">
          <PosterEditableText
            cardId={cardId}
            fieldKey={posterInlineEditFieldKey(cardId, {
              kind: "sidePanel",
              panel: "leftSide",
              field: "content",
            })}
            value={leftPanel.body}
            variant="body-text"
            placeholder="Left body"
          >
            <span>{leftPanel.body}</span>
          </PosterEditableText>
        </p>
        {leftPanel.example || showOptional ?
          <p className="text-base font-semibold text-kid-ink/80 md:text-lg">
            <PosterEditableText
              cardId={cardId}
              fieldKey={posterInlineEditFieldKey(cardId, {
                kind: "sidePanel",
                panel: "leftSide",
                field: "example",
              })}
              value={leftPanel.example ?? ""}
              variant="example-sentence"
              placeholder="Left example"
            >
              <span>{leftPanel.example || (showOptional ? "Example (optional)" : "")}</span>
            </PosterEditableText>
          </p>
        : null}
        {section.leftPatterns?.map((pattern, index) => (
          <PosterPatternRow
            key={`${pattern.label}-${index}`}
            cardId={cardId}
            patternIndex={index}
            pattern={pattern}
            variant={variant}
          />
        ))}
      </div>
      <div className="sm:border-l-2 sm:border-dashed sm:border-kid-ink/30 sm:pl-4">
        <PosterNoteBox
          cardId={cardId}
          bodyFieldKey={posterInlineEditFieldKey(cardId, {
            kind: "sidePanel",
            panel: "rightSide",
            field: "content",
          })}
          highlightFieldKey={posterInlineEditFieldKey(cardId, {
            kind: "sidePanel",
            panel: "rightSide",
            field: "warning",
          })}
          title={rightPanel.title ?? "Note"}
          body={rightPanel.body}
          highlight={rightHighlight}
          variant={variant}
        />
      </div>
    </div>
  );
}
