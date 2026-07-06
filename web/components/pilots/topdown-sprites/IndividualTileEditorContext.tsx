"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { IndividualTileDef } from "@/lib/topdown/individual-tiles";

type IndividualTileEditorContextValue = {
  editingTile: IndividualTileDef | null;
  openEditor: (tile: IndividualTileDef) => void;
  closeEditor: () => void;
};

const IndividualTileEditorContext =
  createContext<IndividualTileEditorContextValue | null>(null);

export function IndividualTileEditorProvider({ children }: { children: ReactNode }) {
  const [editingTile, setEditingTile] = useState<IndividualTileDef | null>(null);

  const openEditor = useCallback((tile: IndividualTileDef) => {
    setEditingTile(tile);
  }, []);

  const closeEditor = useCallback(() => {
    setEditingTile(null);
  }, []);

  const value = useMemo(
    () => ({ editingTile, openEditor, closeEditor }),
    [editingTile, openEditor, closeEditor],
  );

  return (
    <IndividualTileEditorContext.Provider value={value}>
      {children}
    </IndividualTileEditorContext.Provider>
  );
}

export function useIndividualTileEditor() {
  const ctx = useContext(IndividualTileEditorContext);
  if (!ctx) {
    throw new Error(
      "useIndividualTileEditor must be used within IndividualTileEditorProvider",
    );
  }
  return ctx;
}
