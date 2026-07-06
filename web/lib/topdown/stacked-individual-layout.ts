export type TileRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type TileLayoutPreset = {
  logicalTilePx: number;
  lipOverlapPx: number;
  columnOverlapPx: number;
};

export type StackedSpritePlacement = {
  scale: number;
  displayW: number;
  displayH: number;
  offsetX: number;
  offsetY: number;
};

export function clampTileRect(
  rect: TileRect,
  imageWidth: number,
  imageHeight: number,
): TileRect {
  const w = Math.max(1, Math.min(Math.round(rect.w), imageWidth));
  const h = Math.max(1, Math.min(Math.round(rect.h), imageHeight));
  const x = Math.max(0, Math.min(Math.round(rect.x), imageWidth - w));
  const y = Math.max(0, Math.min(Math.round(rect.y), imageHeight - h));
  return { x, y, w, h };
}

/** Place the full PNG so the footprint width maps to logicalTilePx. */
export function computeStackedSpritePlacement(
  imageWidth: number,
  imageHeight: number,
  footprint: TileRect,
  logicalTilePx: number,
): StackedSpritePlacement {
  const scale = logicalTilePx / footprint.w;
  return {
    scale,
    displayW: Math.round(imageWidth * scale),
    displayH: Math.round(imageHeight * scale),
    offsetX: -footprint.x * scale,
    offsetY: -footprint.y * scale,
  };
}

export function rowStridePx(layout: TileLayoutPreset): number {
  return Math.max(1, layout.logicalTilePx - layout.lipOverlapPx);
}

export function columnStridePx(layout: TileLayoutPreset): number {
  return Math.max(1, layout.logicalTilePx - layout.columnOverlapPx);
}

export function formatTilePresetTs(args: {
  exportName: string;
  id: string;
  label: string;
  category: string;
  imageSrc: string;
  width: number;
  height: number;
  content: TileRect;
  footprint: TileRect;
  layout: TileLayoutPreset;
}): string {
  const { content, footprint, layout } = args;
  return `export const ${args.exportName} = {
  id: ${JSON.stringify(args.id)},
  label: ${JSON.stringify(args.label)},
  category: ${JSON.stringify(args.category)},
  imageSrc: ${JSON.stringify(args.imageSrc)},
  width: ${args.width},
  height: ${args.height},
  content: { x: ${content.x}, y: ${content.y}, w: ${content.w}, h: ${content.h} },
  footprint: { x: ${footprint.x}, y: ${footprint.y}, w: ${footprint.w}, h: ${footprint.h} },
  layout: {
    logicalTilePx: ${layout.logicalTilePx},
    lipOverlapPx: ${layout.lipOverlapPx},
    columnOverlapPx: ${layout.columnOverlapPx},
  },
} as const;
`;
}
