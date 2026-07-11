"use client";

import {
  posterInlineEditFieldKey,
  type PosterSidePanelField,
  type PosterSidePanelKey,
} from "@/lib/grammar-builder/editor/poster-inline-edit-fields";
import { PosterEditableText } from "./editor/PosterEditableText";
import { PosterInteractiveTarget } from "./interactions/PosterInteractiveTarget";
import type { PosterSection, PosterSidePanel } from "./poster-view-model";
import type { GrammarPosterVariant } from "./poster-variant";

type Props = {
  section: PosterSection;
  variant?: GrammarPosterVariant;
};

function panelEditableLines(
  panel: PosterSidePanel,
): { field: PosterSidePanelField; text: string }[] {
  const lines: { field: PosterSidePanelField; text: string }[] = [];
  if (panel.example?.trim()) {
    lines.push({ field: "example", text: panel.example.trim() });
  }
  if (panel.body?.trim() && panel.body !== panel.example?.trim()) {
    lines.push({ field: "content", text: panel.body.trim() });
  }
  if (panel.formula?.trim()) {
    lines.push({ field: "formula", text: panel.formula.trim() });
  }
  return lines;
}

function AnswerColumn({
  cardId,
  panelKey,
  panel,
  accentColor,
  defaultTitle,
  variant,
}: {
  cardId: number;
  panelKey: PosterSidePanelKey;
  panel: PosterSidePanel;
  accentColor: string;
  defaultTitle: string;
  variant: GrammarPosterVariant;
}) {
  const title = panel.title?.trim() || defaultTitle;
  const lines = panelEditableLines(panel);
  const textClass =
    variant === "poster" ?
      "text-base font-semibold leading-relaxed text-kid-ink md:text-lg"
    : "text-sm font-semibold leading-relaxed text-kid-ink";

  return (
    <div>
      <h3
        className="mb-2 text-xs font-extrabold uppercase tracking-wide md:text-sm"
        style={{ color: accentColor }}
      >
        <PosterEditableText
          cardId={cardId}
          fieldKey={posterInlineEditFieldKey(cardId, {
            kind: "sidePanel",
            panel: panelKey,
            field: "title",
          })}
          value={title}
          variant="column-title"
          placeholder={defaultTitle}
        >
          <span>{title}</span>
        </PosterEditableText>
      </h3>
      <div className="space-y-1">
        {lines.map((line, i) => (
          <p key={`${line.field}-${i}`} className={textClass}>
            <PosterEditableText
              cardId={cardId}
              fieldKey={posterInlineEditFieldKey(cardId, {
                kind: "sidePanel",
                panel: panelKey,
                field: line.field,
              })}
              value={line.text}
              variant={line.field === "formula" ? "formula-mono" : "example-sentence"}
              placeholder="Answer line"
            >
              <span>{line.text}</span>
            </PosterEditableText>
          </p>
        ))}
      </div>
    </div>
  );
}

export function PosterPositiveNegativeBody({ section, variant = "poster" }: Props) {
  const positivePanel = section.positivePanel;
  const negativePanel = section.negativePanel;

  if (!positivePanel || !negativePanel) {
    return null;
  }

  const accentColor = section.palette?.header ?? "#1d4ed8";

  return (
    <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
      <PosterInteractiveTarget cardId={section.number} region="positiveSide">
        <AnswerColumn
          cardId={section.number}
          panelKey="positiveSide"
          panel={positivePanel}
          accentColor={accentColor}
          defaultTitle="Yes"
          variant={variant}
        />
      </PosterInteractiveTarget>
      <div className="sm:border-l-2 sm:border-dashed sm:border-kid-ink/30 sm:pl-4">
        <PosterInteractiveTarget cardId={section.number} region="negativeSide">
          <AnswerColumn
            cardId={section.number}
            panelKey="negativeSide"
            panel={negativePanel}
            accentColor={accentColor}
            defaultTitle="No"
            variant={variant}
          />
        </PosterInteractiveTarget>
      </div>
    </div>
  );
}
