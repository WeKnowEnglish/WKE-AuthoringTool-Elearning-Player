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
import type { PreviewAtlasId } from "@/lib/topdown/atlas-registry";
import { getPreviewAtlasEntry } from "@/lib/topdown/atlas-registry";
import {
  clampStackPresetToCrop,
  cropSizeKey,
  defaultAtlasTileStackPreset,
  migrateLegacyStackPreset,
  stackOverrideKey,
  type AtlasTileStackPreset,
  type LegacyAtlasTileStackPreset,
} from "@/lib/topdown/atlas-tile-layout";
import { getGardenOverlayStackPreset } from "@/lib/topdown/garden-overlay-presets";
import { getLetterFruitStackPreset } from "@/lib/topdown/letter-fruit-overlay-presets";
import {
  boundsOverrideKey,
  clampSpriteRect,
} from "@/lib/topdown/bounds-editor-utils";
import {
  isBoardAtlasId,
  resolveSpriteBounds,
  resolveStackPreset,
} from "@/lib/topdown/resolve-sprite-bounds";
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
  getStackPreset: (atlasId: string, assetId: string, crop: SpriteRect) => AtlasTileStackPreset;
  setStackPreset: (atlasId: string, assetId: string, crop: SpriteRect, preset: AtlasTileStackPreset) => void;
  resetStackPreset: (atlasId: string, assetId: string) => void;
  getDefaultStackPreset: (atlasId: string, assetId: string, crop: SpriteRect) => AtlasTileStackPreset;
};

const BoundsOverrideContext = createContext<BoundsOverrideContextValue | null>(null);

const BOUNDS_STORAGE_KEY = "topdown-sprite-bounds-overrides";
const STACK_STORAGE_KEY = "topdown-atlas-stack-overrides";
const LEGACY_BOUNDS_SESSION_KEY = "topdown-sprite-bounds-overrides";
const LEGACY_STACK_SESSION_KEY = "topdown-atlas-stack-overrides";

type StackOverrideEntry = {
  preset: AtlasTileStackPreset;
  cropKey: string;
};

function isStackOverrideEntry(value: unknown): value is StackOverrideEntry {
  return (
    value != null &&
    typeof value === "object" &&
    "preset" in value &&
    "cropKey" in value &&
    typeof (value as StackOverrideEntry).cropKey === "string"
  );
}

function readJsonStorage(key: string, legacySessionKey?: string): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed && typeof parsed === "object") return parsed;
    }
    if (legacySessionKey) {
      const legacyRaw = window.sessionStorage.getItem(legacySessionKey);
      if (!legacyRaw) return {};
      const legacyParsed = JSON.parse(legacyRaw) as Record<string, unknown>;
      if (legacyParsed && typeof legacyParsed === "object") {
        window.localStorage.setItem(key, legacyRaw);
        window.sessionStorage.removeItem(legacySessionKey);
        return legacyParsed;
      }
    }
    return {};
  } catch {
    return {};
  }
}

function writeJsonStorage(key: string, value: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors in dev tooling
  }
}

function readStoredStack(): Record<string, StackOverrideEntry> {
  const parsed = readJsonStorage(STACK_STORAGE_KEY, LEGACY_STACK_SESSION_KEY);
  const next: Record<string, StackOverrideEntry> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (isStackOverrideEntry(value)) {
      next[key] = value;
    } else if (value && typeof value === "object" && "walk" in value) {
      next[key] = {
        preset: value as AtlasTileStackPreset,
        cropKey: "",
      };
    }
  }
  return next;
}

function writeStoredStack(overrides: Record<string, StackOverrideEntry>) {
  writeJsonStorage(STACK_STORAGE_KEY, overrides);
}

function readStoredBounds(): Record<string, SpriteRect> {
  const parsed = readJsonStorage(BOUNDS_STORAGE_KEY, LEGACY_BOUNDS_SESSION_KEY);
  const next: Record<string, SpriteRect> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (
      value &&
      typeof value === "object" &&
      "sx" in value &&
      "sy" in value &&
      "sw" in value &&
      "sh" in value
    ) {
      next[key] = value as SpriteRect;
    }
  }
  return next;
}

function writeStoredBounds(overrides: Record<string, SpriteRect>) {
  writeJsonStorage(BOUNDS_STORAGE_KEY, overrides);
}

function resolveDefaultStackPreset(
  atlasId: string,
  assetId: string,
  crop: SpriteRect,
): AtlasTileStackPreset {
  if (isBoardAtlasId(atlasId)) {
    return resolveStackPreset(atlasId, assetId, crop);
  }
  if (atlasId === "garden") {
    return getGardenOverlayStackPreset(assetId, crop.sw, crop.sh);
  }
  if (atlasId.startsWith("letter-fruit-")) {
    return getLetterFruitStackPreset(assetId, crop.sw, crop.sh);
  }
  return defaultAtlasTileStackPreset(crop.sw, crop.sh);
}

export function BoundsOverrideProvider({ children }: { children: ReactNode }) {
  const [boundsOverrides, setBoundsOverrides] = useState<Record<string, SpriteRect>>({});
  const [stackOverrides, setStackOverrides] = useState<Record<string, StackOverrideEntry>>({});
  const [editorTarget, setEditorTarget] = useState<BoundsEditorTarget | null>(null);

  useEffect(() => {
    setBoundsOverrides(readStoredBounds());
    setStackOverrides(readStoredStack());
  }, []);

  const persistBounds = useCallback(
    (
      updater:
        | Record<string, SpriteRect>
        | ((prev: Record<string, SpriteRect>) => Record<string, SpriteRect>),
    ) => {
      setBoundsOverrides((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        writeStoredBounds(next);
        return next;
      });
    },
    [],
  );

  const persistStack = useCallback(
    (
      updater:
        | Record<string, StackOverrideEntry>
        | ((prev: Record<string, StackOverrideEntry>) => Record<string, StackOverrideEntry>),
    ) => {
      setStackOverrides((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        writeStoredStack(next);
        return next;
      });
    },
    [],
  );

  const getDefaultBounds = useCallback((atlasId: string, assetId: string) => {
    if (isBoardAtlasId(atlasId)) {
      try {
        return resolveSpriteBounds(atlasId, assetId);
      } catch {
        return undefined;
      }
    }
    const entry = getPreviewAtlasEntry(atlasId);
    return entry?.atlas.assets[assetId];
  }, []);

  const getBounds = useCallback(
    (atlasId: string, assetId: string, fallback: SpriteRect) => {
      const key = boundsOverrideKey(atlasId, assetId);
      return boundsOverrides[key] ?? fallback;
    },
    [boundsOverrides],
  );

  const setBounds = useCallback(
    (atlasId: string, assetId: string, rect: SpriteRect) => {
      const entry = getPreviewAtlasEntry(atlasId);
      if (!entry) return;
      const clamped = clampSpriteRect(rect, entry.atlas.width, entry.atlas.height);
      const key = boundsOverrideKey(atlasId, assetId);
      persistBounds((prev) => ({ ...prev, [key]: clamped }));
    },
    [persistBounds],
  );

  const resetBounds = useCallback(
    (atlasId: string, assetId: string) => {
      const key = boundsOverrideKey(atlasId, assetId);
      persistBounds((prev) => {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [persistBounds],
  );

  const getDefaultStackPreset = useCallback(
    (atlasId: string, assetId: string, crop: SpriteRect) =>
      resolveDefaultStackPreset(atlasId, assetId, crop),
    [],
  );

  const getStackPreset = useCallback(
    (atlasId: string, assetId: string, crop: SpriteRect) => {
      const key = stackOverrideKey(atlasId, assetId);
      const fallback = resolveDefaultStackPreset(atlasId, assetId, crop);
      const stored = stackOverrides[key];
      if (!stored) return fallback;
      const keyForCrop = cropSizeKey(crop.sw, crop.sh);
      if (stored.cropKey && stored.cropKey !== keyForCrop) return fallback;
      return clampStackPresetToCrop(
        migrateLegacyStackPreset(stored.preset as LegacyAtlasTileStackPreset, crop.sw, crop.sh),
        crop.sw,
        crop.sh,
      );
    },
    [stackOverrides],
  );

  const setStackPreset = useCallback(
    (atlasId: string, assetId: string, crop: SpriteRect, preset: AtlasTileStackPreset) => {
      const key = stackOverrideKey(atlasId, assetId);
      persistStack((prev) => ({
        ...prev,
        [key]: {
          preset: clampStackPresetToCrop(preset, crop.sw, crop.sh),
          cropKey: cropSizeKey(crop.sw, crop.sh),
        },
      }));
    },
    [persistStack],
  );

  const resetStackPreset = useCallback(
    (atlasId: string, assetId: string) => {
      const key = stackOverrideKey(atlasId, assetId);
      persistStack((prev) => {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [persistStack],
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
      getStackPreset,
      setStackPreset,
      resetStackPreset,
      getDefaultStackPreset,
    }),
    [
      editorTarget,
      openEditor,
      closeEditor,
      getBounds,
      setBounds,
      resetBounds,
      getDefaultBounds,
      getStackPreset,
      setStackPreset,
      resetStackPreset,
      getDefaultStackPreset,
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
