"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { GrammarModule } from "@/lib/grammar-builder/schema";
import {
  commitPosterInlineEditValue,
  readPosterInlineEditValue,
} from "@/lib/grammar-builder/editor/poster-inline-edit-commit";
import { parsePosterInlineEditFieldKey } from "@/lib/grammar-builder/editor/poster-inline-edit-fields";

export type PosterInlineEditConfig = {
  enabled: boolean;
  selectedCardId: number | null;
  activeFieldKey: string | null;
  onSelectCard: (cardId: number) => void;
  onActivateField: (fieldKey: string) => void;
  onDeactivateField: () => void;
  getFieldValue: (fieldKey: string) => string;
  onCommitField: (fieldKey: string, value: string) => void;
};

const PosterInlineEditContext = createContext<PosterInlineEditConfig | null>(null);

export function usePosterInlineEdit(): PosterInlineEditConfig | null {
  return useContext(PosterInlineEditContext);
}

type ProviderProps = {
  draft: GrammarModule;
  enabled: boolean;
  selectedCardId: number | null;
  activeFieldKey: string | null;
  onSelectCard: (cardId: number) => void;
  onActivateField: (fieldKey: string) => void;
  onDeactivateField: () => void;
  onChange: (module: GrammarModule) => void;
  children: ReactNode;
};

export function PosterInlineEditProvider({
  draft,
  enabled,
  selectedCardId,
  activeFieldKey,
  onSelectCard,
  onActivateField,
  onDeactivateField,
  onChange,
  children,
}: ProviderProps) {
  const getFieldValue = useCallback(
    (fieldKey: string) => {
      const parsed = parsePosterInlineEditFieldKey(fieldKey);
      if (!parsed) {
        return "";
      }
      return readPosterInlineEditValue(draft, parsed.cardId, parsed.target);
    },
    [draft],
  );

  const onCommitField = useCallback(
    (fieldKey: string, value: string) => {
      const parsed = parsePosterInlineEditFieldKey(fieldKey);
      if (!parsed) {
        return;
      }
      onChange(commitPosterInlineEditValue(draft, parsed.cardId, parsed.target, value));
      onDeactivateField();
    },
    [draft, onChange, onDeactivateField],
  );

  const value = useMemo<PosterInlineEditConfig>(
    () => ({
      enabled,
      selectedCardId,
      activeFieldKey,
      onSelectCard,
      onActivateField,
      onDeactivateField,
      getFieldValue,
      onCommitField,
    }),
    [
      enabled,
      selectedCardId,
      activeFieldKey,
      onSelectCard,
      onActivateField,
      onDeactivateField,
      getFieldValue,
      onCommitField,
    ],
  );

  return (
    <PosterInlineEditContext.Provider value={value}>{children}</PosterInlineEditContext.Provider>
  );
}
