"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  LetterFruitAssetKey,
  LetterFruitStageId,
} from "@/lib/topdown/letter-fruit-atlas";
import { letterFruitAssetKey } from "@/lib/topdown/letter-fruit-atlas";
import { useOptionalLetterFruitSelector } from "@/components/pilots/topdown-sprites/LetterFruitSelectorContext";
import { resolveLetterFruitSlug } from "@/lib/topdown/letter-fruit-slug";
import type { LetterFruitSlug } from "@/lib/topdown/letter-fruit-variants";
import { getLetterFruitPlotPreset } from "@/lib/topdown/letter-fruit-plot-presets";
import type { LetterFruitPlotPreset } from "@/lib/topdown/plot-layer-types";

export type PlotLayerEditorTarget = {
  assetKey: LetterFruitAssetKey;
  label: string;
};

type PlotLayerEditorContextValue = {
  editorTarget: PlotLayerEditorTarget | null;
  openEditor: (target: PlotLayerEditorTarget) => void;
  closeEditor: () => void;
  getPlotPreset: (assetKey: LetterFruitAssetKey) => LetterFruitPlotPreset;
  getDefaultPlotPreset: (assetKey: LetterFruitAssetKey) => LetterFruitPlotPreset;
  setPlotPreset: (assetKey: LetterFruitAssetKey, preset: LetterFruitPlotPreset) => void;
  resetPlotPreset: (assetKey: LetterFruitAssetKey) => void;
  clearAllPlotOverrides: () => void;
};

const PlotLayerEditorContext = createContext<PlotLayerEditorContextValue | null>(null);

const STORAGE_KEY = "letter-fruit-plot-overrides";

function normalizePreset(
  assetKey: LetterFruitAssetKey,
  override?: Partial<LetterFruitPlotPreset> | null,
): LetterFruitPlotPreset {
  const defaults = getLetterFruitPlotPreset(assetKey);
  if (!override) {
    return {
      ...defaults,
      layer: { ...defaults.layer },
    };
  }
  return {
    baseTileId: override.baseTileId ?? defaults.baseTileId,
    fruitStage: override.fruitStage ?? defaults.fruitStage,
    layer: {
      ...defaults.layer,
      ...override.layer,
    },
  };
}

function isLetterFruitPlotPreset(value: unknown): value is LetterFruitPlotPreset {
  if (!value || typeof value !== "object") return false;
  const preset = value as LetterFruitPlotPreset;
  return (
    typeof preset.baseTileId === "string" &&
    typeof preset.fruitStage === "string" &&
    preset.layer != null &&
    typeof preset.layer.scale === "number" &&
    typeof preset.layer.offsetX === "number" &&
    typeof preset.layer.offsetY === "number" &&
    typeof preset.layer.anchor === "string"
  );
}

function readStoredOverrides(): Partial<Record<LetterFruitAssetKey, LetterFruitPlotPreset>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const next: Partial<Record<LetterFruitAssetKey, LetterFruitPlotPreset>> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (isLetterFruitPlotPreset(value)) {
        next[key as LetterFruitAssetKey] = value;
      }
    }
    return next;
  } catch {
    return {};
  }
}

function writeStoredOverrides(
  overrides: Partial<Record<LetterFruitAssetKey, LetterFruitPlotPreset>>,
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // ignore quota errors in dev tooling
  }
}

export function PlotLayerEditorProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<
    Partial<Record<LetterFruitAssetKey, LetterFruitPlotPreset>>
  >({});
  const [editorTarget, setEditorTarget] = useState<PlotLayerEditorTarget | null>(null);

  useEffect(() => {
    setOverrides(readStoredOverrides());
  }, []);

  const persistOverrides = useCallback(
    (
      updater:
        | Partial<Record<LetterFruitAssetKey, LetterFruitPlotPreset>>
        | ((
            prev: Partial<Record<LetterFruitAssetKey, LetterFruitPlotPreset>>,
          ) => Partial<Record<LetterFruitAssetKey, LetterFruitPlotPreset>>),
    ) => {
      setOverrides((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        writeStoredOverrides(next);
        return next;
      });
    },
    [],
  );

  const getDefaultPlotPreset = useCallback((assetKey: LetterFruitAssetKey) => {
    return getLetterFruitPlotPreset(assetKey);
  }, []);

  const getPlotPreset = useCallback(
    (assetKey: LetterFruitAssetKey) => {
      return normalizePreset(assetKey, overrides[assetKey]);
    },
    [overrides],
  );

  const setPlotPreset = useCallback(
    (assetKey: LetterFruitAssetKey, preset: LetterFruitPlotPreset) => {
      persistOverrides((prev) => ({
        ...prev,
        [assetKey]: normalizePreset(assetKey, preset),
      }));
    },
    [persistOverrides],
  );

  const resetPlotPreset = useCallback(
    (assetKey: LetterFruitAssetKey) => {
      persistOverrides((prev) => {
        const next = { ...prev };
        delete next[assetKey];
        return next;
      });
    },
    [persistOverrides],
  );

  const clearAllPlotOverrides = useCallback(() => {
    persistOverrides({});
  }, [persistOverrides]);

  const openEditor = useCallback((target: PlotLayerEditorTarget) => {
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
      getPlotPreset,
      getDefaultPlotPreset,
      setPlotPreset,
      resetPlotPreset,
      clearAllPlotOverrides,
    }),
    [
      editorTarget,
      openEditor,
      closeEditor,
      getPlotPreset,
      getDefaultPlotPreset,
      setPlotPreset,
      resetPlotPreset,
      clearAllPlotOverrides,
    ],
  );

  return (
    <PlotLayerEditorContext.Provider value={value}>
      {children}
    </PlotLayerEditorContext.Provider>
  );
}

export function usePlotLayerEditor() {
  const ctx = useContext(PlotLayerEditorContext);
  if (!ctx) {
    throw new Error(
      "usePlotLayerEditor must be used within PlotLayerEditorProvider",
    );
  }
  return ctx;
}

export function useResolvedPlotPreset(
  assetKey: LetterFruitAssetKey,
): LetterFruitPlotPreset {
  const ctx = useContext(PlotLayerEditorContext);
  if (!ctx) return getLetterFruitPlotPreset(assetKey);
  return ctx.getPlotPreset(assetKey);
}

export function useResolvedPlotPresetForStage(
  stage: LetterFruitStageId,
  slugOverride?: LetterFruitSlug,
): LetterFruitPlotPreset {
  const slug = resolveLetterFruitSlug(
    slugOverride,
    useOptionalLetterFruitSelector()?.slug,
  );
  return useResolvedPlotPreset(letterFruitAssetKey(slug, stage));
}
