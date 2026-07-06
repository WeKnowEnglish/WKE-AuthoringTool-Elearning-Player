import type { PosterSection } from "@/components/grammar/poster/poster-view-model";

import { GrammarMapError } from "../map-errors";

import type { GrammarCard } from "../schema";

import { buildSectionBase } from "./map-section-base";

import { mapSidePanel, panelBodyFromSide } from "./map-side-panel";



export function mapFullWidthSplitSection(

  card: GrammarCard,

  options: { requireKidTitle?: boolean; requireGlanceRule?: boolean } = {},

): PosterSection {

  const base = buildSectionBase(card, "full_width_split", options);

  const leftSide = card.leftSide;

  const rightSide = card.rightSide;



  if (!leftSide) {

    throw new GrammarMapError("full-width-split layout requires leftSide", card.id);

  }

  if (!rightSide) {

    throw new GrammarMapError("full-width-split layout requires rightSide", card.id);

  }



  const leftBody = panelBodyFromSide(leftSide);

  if (!leftBody && !leftSide.example?.trim()) {

    throw new GrammarMapError("full-width-split leftSide requires content or example", card.id);

  }



  const rightBody = panelBodyFromSide(rightSide);

  if (!rightBody) {

    throw new GrammarMapError(

      "full-width-split rightSide requires content, formula, or warning",

      card.id,

    );

  }



  const leftPatterns = card.patterns?.map((pattern) => ({

    label: pattern.label,

    formula: pattern.formula,

    emoji: pattern.graphic ?? "📋",

  }));



  const leftPanel = mapSidePanel(leftSide);

  const rightPanel = mapSidePanel(rightSide);



  if (!leftPanel.body && leftPanel.example) {

    leftPanel.body = leftPanel.example;

  }



  return {

    ...base,

    leftPanel,

    rightPanel,

    leftPatterns,

  };

}

