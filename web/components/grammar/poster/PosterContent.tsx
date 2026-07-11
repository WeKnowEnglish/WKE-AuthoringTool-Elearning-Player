"use client";

import { clsx } from "clsx";
import type { GrammarPageLayout, GrammarPageRow } from "@/lib/grammar-builder/schema";
import { getPosterRowGridClass, resolvePageRows } from "@/lib/grammar-builder/poster-page-layout";
import { PosterHero } from "./PosterHero";
import { PosterSectionBody } from "./PosterSectionBody";
import { PosterSectionCard } from "./PosterSectionCard";
import type { PosterHeroData, PosterSection } from "./poster-view-model";
import type { GrammarPosterVariant } from "./poster-variant";

type EditableProps = {
  selectedCardId?: number | null;
  onSelectCard?: (cardId: number) => void;
};

type Props = {
  hero: PosterHeroData;
  sections: PosterSection[];
  pageLayout: GrammarPageLayout;
  customRows?: GrammarPageRow[];
  cardIds?: number[];
  variant?: GrammarPosterVariant;
  editable?: EditableProps;
};

function renderSectionCard(
  section: PosterSection,
  variant: GrammarPosterVariant,
  editable: EditableProps | undefined,
) {
  const isEditable = Boolean(editable?.onSelectCard);
  const isSelected = editable?.selectedCardId === section.number;

  const card = (
    <PosterSectionCard
      number={section.number}
      kidTitle={section.kidTitle}
      kidSubtitle={section.kidSubtitle}
      title={section.title}
      glanceRule={section.glanceRule}
      color={section.color}
      palette={section.palette}
      variant={variant}
    >
      <PosterSectionBody section={section} variant={variant} />
    </PosterSectionCard>
  );

  if (!isEditable) {
    return card;
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => editable?.onSelectCard?.(section.number)}
      onKeyDown={(event) => {
        const target = event.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable
        ) {
          return;
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          editable?.onSelectCard?.(section.number);
        }
      }}
      className={clsx(
        "rounded-2xl transition-shadow outline-none",
        "cursor-pointer",
        isSelected ? "ring-4 ring-kid-cta ring-offset-2" : "hover:ring-2 hover:ring-kid-cta/40",
      )}
    >
      {card}
    </div>
  );
}

export function PosterContent({
  hero,
  sections,
  pageLayout,
  customRows,
  cardIds,
  variant = "poster",
  editable,
}: Props) {
  const sectionById = new Map(sections.map((section) => [section.number, section]));
  const resolvedCardIds = cardIds ?? sections.map((section) => section.number);
  const pageRows = resolvePageRows({
    pageLayout,
    customRows,
    cards: resolvedCardIds.map((id) => ({ id })),
  });

  return (
    <>
      <PosterHero hero={hero} />

      <div className="mt-2 flex flex-col gap-3">
        {pageRows.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className={getPosterRowGridClass(row.columns)}>
            {row.cardIds.map((cardId) => {
              const section = sectionById.get(cardId);
              if (!section) {
                return null;
              }
              return (
                <div key={section.number}>
                  {renderSectionCard(section, variant, editable)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}
