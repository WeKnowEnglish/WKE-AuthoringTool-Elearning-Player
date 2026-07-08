export type GrammarPosterEditorMode = "edit" | "preview";

export type GrammarPosterEditorSelection = {
  selectedCardId: number | null;
  onSelectCard: (cardId: number | null) => void;
};
