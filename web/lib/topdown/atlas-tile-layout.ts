import type { SpriteRect } from "@/lib/topdown/types";
import type { TileLayoutPreset, TileRect } from "@/lib/topdown/stacked-individual-layout";

export type AtlasTileWalk = {
  insetX: number;
  insetY: number;
  width: number;
  height: number;
};

/** Walk surface + lip split inside a tile crop. Bounds (sheet crop) are stored separately. */
export type AtlasTileStackPreset = {
  walk: AtlasTileWalk;
  /** Crop-local row where the lip band begins (typically walk bottom edge). */
  lipStartY: number;
  layout: TileLayoutPreset;
};

/** @deprecated Legacy preset shape — migrated on load. */
export type LegacyAtlasTileStackPreset = {
  content?: TileRect;
  footprint?: TileRect;
  walk?: AtlasTileWalk;
  lipStartY?: number;
  layout: TileLayoutPreset;
};

export function walkBottom(walk: AtlasTileWalk): number {
  return walk.insetY + walk.height;
}

export function walkToTileRect(walk: AtlasTileWalk): TileRect {
  return {
    x: walk.insetX,
    y: walk.insetY,
    w: walk.width,
    h: walk.height,
  };
}

export function defaultAtlasTileStackPreset(sw: number, sh: number): AtlasTileStackPreset {
  const walkHeight = Math.max(8, Math.round(sh * 0.42));
  const walkY = Math.max(0, Math.round(sh * 0.18));
  const insetX = Math.max(0, Math.round(sw * 0.06));

  const walk: AtlasTileWalk = {
    insetX,
    insetY: walkY,
    width: Math.max(1, sw - insetX * 2),
    height: Math.max(1, walkHeight),
  };

  return {
    walk,
    lipStartY: walkBottom(walk),
    layout: {
      logicalTilePx: 64,
      lipOverlapPx: 10,
      columnOverlapPx: 0,
    },
  };
}

function clampWalk(walk: AtlasTileWalk, sw: number, sh: number): AtlasTileWalk {
  const width = Math.max(1, Math.min(Math.round(walk.width), sw));
  const height = Math.max(1, Math.min(Math.round(walk.height), sh));
  const insetX = Math.max(0, Math.min(Math.round(walk.insetX), sw - width));
  const insetY = Math.max(0, Math.min(Math.round(walk.insetY), sh - height));
  return { insetX, insetY, width, height };
}

export function clampStackPresetToCrop(
  preset: AtlasTileStackPreset,
  sw: number,
  sh: number,
): AtlasTileStackPreset {
  const walk = clampWalk(preset.walk, sw, sh);
  const minLip = walkBottom(walk);
  const lipStartY = Math.max(minLip, Math.min(Math.round(preset.lipStartY), sh));
  const logicalTilePx = Math.max(8, preset.layout.logicalTilePx);

  return {
    walk,
    lipStartY,
    layout: {
      logicalTilePx,
      lipOverlapPx: Math.max(0, Math.min(logicalTilePx - 1, preset.layout.lipOverlapPx)),
      columnOverlapPx: Math.max(0, Math.min(logicalTilePx - 1, preset.layout.columnOverlapPx)),
    },
  };
}

/** Lip band from split line to crop bottom (full tile width). */
export function lipRegionInCrop(
  preset: AtlasTileStackPreset,
  cropHeight: number,
  cropWidth: number,
): TileRect | null {
  if (preset.lipStartY >= cropHeight) return null;
  return {
    x: 0,
    y: preset.lipStartY,
    w: cropWidth,
    h: cropHeight - preset.lipStartY,
  };
}

export function migrateLegacyStackPreset(
  raw: LegacyAtlasTileStackPreset,
  sw: number,
  sh: number,
): AtlasTileStackPreset {
  if (raw.walk && typeof raw.lipStartY === "number") {
    return clampStackPresetToCrop(
      { walk: raw.walk, lipStartY: raw.lipStartY, layout: raw.layout },
      sw,
      sh,
    );
  }

  if (raw.footprint) {
    const walk: AtlasTileWalk = {
      insetX: raw.footprint.x,
      insetY: raw.footprint.y,
      width: raw.footprint.w,
      height: raw.footprint.h,
    };
    return clampStackPresetToCrop(
      {
        walk,
        lipStartY: raw.lipStartY ?? walkBottom(walk),
        layout: raw.layout,
      },
      sw,
      sh,
    );
  }

  return defaultAtlasTileStackPreset(sw, sh);
}

/** Keep lip line attached to walk bottom when it was previously synced. */
export function updateWalkInPreset(
  preset: AtlasTileStackPreset,
  patch: Partial<AtlasTileWalk>,
  sw: number,
  sh: number,
): AtlasTileStackPreset {
  const wasSynced = preset.lipStartY === walkBottom(preset.walk);
  const next = clampStackPresetToCrop(
    {
      ...preset,
      walk: { ...preset.walk, ...patch },
    },
    sw,
    sh,
  );
  if (wasSynced) {
    next.lipStartY = walkBottom(next.walk);
  }
  return next;
}

export function formatAtlasStackPresetExport(
  assetId: string,
  bounds: SpriteRect,
  stack: AtlasTileStackPreset,
): string {
  const { walk, lipStartY, layout } = stack;
  return `${assetId}: {
  bounds: { sx: ${bounds.sx}, sy: ${bounds.sy}, sw: ${bounds.sw}, sh: ${bounds.sh} },
  walk: { insetX: ${walk.insetX}, insetY: ${walk.insetY}, width: ${walk.width}, height: ${walk.height} },
  lipStartY: ${lipStartY},
  layout: { logicalTilePx: ${layout.logicalTilePx}, lipOverlapPx: ${layout.lipOverlapPx}, columnOverlapPx: ${layout.columnOverlapPx} },
},`;
}

export function stackOverrideKey(atlasId: string, assetId: string): string {
  return `${atlasId}:${assetId}:stack`;
}

export function cropSizeKey(sw: number, sh: number): string {
  return `${sw}x${sh}`;
}

export type StackPresetResolveSource = "detect" | "manual-crop" | "manual-walk" | "reset";

export type ResolveStackPresetArgs = {
  source: StackPresetResolveSource;
  crop: SpriteRect;
  canonicalBounds?: SpriteRect;
  filePreset: AtlasTileStackPreset;
  sessionPreset?: AtlasTileStackPreset;
  previousCrop?: SpriteRect;
};

export function resolveStackPresetForCrop(args: ResolveStackPresetArgs): AtlasTileStackPreset {
  const { source, crop, canonicalBounds, filePreset, sessionPreset, previousCrop } = args;

  if (source === "manual-walk" && sessionPreset) {
    return clampStackPresetToCrop(sessionPreset, crop.sw, crop.sh);
  }

  const sizeChanged =
    previousCrop != null &&
    (previousCrop.sw !== crop.sw || previousCrop.sh !== crop.sh);

  const shouldReResolve =
    source === "detect" ||
    source === "reset" ||
    source === "manual-crop" ||
    sizeChanged;

  if (!shouldReResolve && sessionPreset) {
    return clampStackPresetToCrop(sessionPreset, crop.sw, crop.sh);
  }

  if (
    canonicalBounds &&
    crop.sw === canonicalBounds.sw &&
    crop.sh === canonicalBounds.sh
  ) {
    return clampStackPresetToCrop(filePreset, crop.sw, crop.sh);
  }

  return defaultAtlasTileStackPreset(crop.sw, crop.sh);
}

/** @deprecated Use resolveStackPresetForCrop */
export function resolveStackPresetAfterDetect(
  detected: SpriteRect,
  canonicalBounds: SpriteRect | undefined,
  filePreset: AtlasTileStackPreset,
): AtlasTileStackPreset {
  return resolveStackPresetForCrop({
    source: "detect",
    crop: detected,
    canonicalBounds,
    filePreset,
  });
}

export function formatAtlasBoundsExport(assetId: string, bounds: SpriteRect): string {
  return `${assetId}: { sx: ${bounds.sx}, sy: ${bounds.sy}, sw: ${bounds.sw}, sh: ${bounds.sh} },`;
}

export function formatAtlasFullTileExport(
  assetId: string,
  bounds: SpriteRect,
  stack: AtlasTileStackPreset,
): string {
  const { walk, lipStartY, layout } = stack;
  return `${assetId}: {
  bounds: { sx: ${bounds.sx}, sy: ${bounds.sy}, sw: ${bounds.sw}, sh: ${bounds.sh} },
  walk: { insetX: ${walk.insetX}, insetY: ${walk.insetY}, width: ${walk.width}, height: ${walk.height} },
  lipStartY: ${lipStartY},
  layout: { logicalTilePx: ${layout.logicalTilePx}, lipOverlapPx: ${layout.lipOverlapPx}, columnOverlapPx: ${layout.columnOverlapPx} },
},`;
}
