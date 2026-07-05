import type { PosterSidePanel } from "@/components/grammar/poster/poster-view-model";

export type GrammarSidePanelFields = {
  title?: string;
  content?: string;
  example?: string;
  formula?: string;
  warning?: string;
};

export function sideHasDisplayContent(side: GrammarSidePanelFields): boolean {
  return !!(
    side.content?.trim() ||
    side.example?.trim() ||
    side.formula?.trim()
  );
}

export function panelBodyFromSide(side: GrammarSidePanelFields): string {
  if (side.content?.trim()) {
    return side.content.trim();
  }
  if (side.formula?.trim()) {
    return side.formula.trim();
  }
  if (side.warning?.trim()) {
    return side.warning.trim();
  }
  return "";
}

export function mapSidePanel(side: GrammarSidePanelFields): PosterSidePanel {
  return {
    title: side.title,
    body: panelBodyFromSide(side),
    example: side.example,
    formula: side.formula,
    warning: side.warning,
  };
}
