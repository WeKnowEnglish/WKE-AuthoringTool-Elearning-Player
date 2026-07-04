"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PreviewAtlasId } from "@/lib/topdown/atlas-registry";
import { getPreviewAtlasEntry } from "@/lib/topdown/atlas-registry";
import {
  boundsOverrideKey,
  clampSpriteRect,
} from "@/lib/topdown/bounds-editor-utils";
import type { SpriteRect } from "@/lib/topdown/types";

export type BoundsEditorTarget = {
  atlasId: PreviewAtlasId;
  assetId: string;
  label: string;
};

type BoundsOverrideContextValue = {
  editorTarget: BoundsEditorTarget | null;
  openEditor: (target: BoundsEditorTarget) => void;
  closeEditor: () => void;
  getBounds: (atlasId: string, assetId: string, fallback: SpriteRect) => SpriteRect;
  setBounds: (atlasId: string, assetId: string, rect: SpriteRect) => void;
  resetBounds: (atlasId: string, assetId: string) => void;
  getDefaultBounds: (atlasId: string, assetId: string) => SpriteRect | undefined;
};

const BoundsOverrideContext = createContext<BoundsOverrideContextValue | null>(null);

const STORAGE_KEY = "topdown-sprite-bounds-overrides";

function readStoredOverrides(): Record<string, SpriteRect> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, SpriteRect>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStoredOverrides(overrides: Record<string, SpriteRect>) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // ignore quota errors in dev tooling
  }
}

export function BoundsOverrideProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Record<string, SpriteRect>>(readStoredOverrides);
  const [editorTarget, setEditorTarget] = useState<BoundsEditorTarget | null>(null);

  const persistOverrides = useCallback(
    (
      updater:
        | Record<string, SpriteRect>
        | ((prev: Record<string, SpriteRect>) => Record<string, SpriteRect>),
    ) => {
      setOverrides((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        writeStoredOverrides(next);
        return next;
      });
    },
    [],
  );

  const getDefaultBounds = useCallback((atlasId: string, assetId: string) => {
    const entry = getPreviewAtlasEntry(atlasId);
    return entry?.atlas.assets[assetId];
  }, []);

  const getBounds = useCallback(
    (atlasId: string, assetId: string, fallback: SpriteRect) => {
      const key = boundsOverrideKey(atlasId, assetId);
      return overrides[key] ?? fallback;
    },
    [overrides],
  );

  const setBounds = useCallback(
    (atlasId: string, assetId: string, rect: SpriteRect) => {
      const entry = getPreviewAtlasEntry(atlasId);
      if (!entry) return;
      const clamped = clampSpriteRect(rect, entry.atlas.width, entry.atlas.height);
      const key = boundsOverrideKey(atlasId, assetId);
      persistOverrides((prev) => ({ ...prev, [key]: clamped }));
    },
    [persistOverrides],
  );

  const resetBounds = useCallback(
    (atlasId: string, assetId: string) => {
      const key = boundsOverrideKey(atlasId, assetId);
      persistOverrides((prev) => {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [persistOverrides],
  );

  const openEditor = useCallback((target: BoundsEditorTarget) => {
    setEditorTarget(target);
  }, []);

  const closeEditor = useCallback(() => {
    setEditorTarget(null);
  }, []);

  const value = useMemo(
    () => ({
      editorTarget,
      openEditor,
      closeEditor,
      getBounds,
      setBounds,
      resetBounds,
      getDefaultBounds,
    }),
    [
      editorTarget,
      openEditor,
      closeEditor,
      getBounds,
      setBounds,
      resetBounds,
      getDefaultBounds,
    ],
  );

  return (
    <BoundsOverrideContext.Provider value={value}>{children}</BoundsOverrideContext.Provider>
  );
}

export function useBoundsOverride() {
  const ctx = useContext(BoundsOverrideContext);
  if (!ctx) {
    throw new Error("useBoundsOverride must be used within BoundsOverrideProvider");
  }
  return ctx;
}

export function useResolvedSpriteBounds(
  atlasId: string,
  assetId: string,
  fallback: SpriteRect,
): SpriteRect {
  const { getBounds } = useBoundsOverride();
  return getBounds(atlasId, assetId, fallback);
}
