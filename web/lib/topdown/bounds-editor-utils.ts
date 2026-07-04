import type { SpriteRect } from "@/lib/topdown/types";

export type BoundsField = keyof SpriteRect;

export function clampSpriteRect(
  rect: SpriteRect,
  sheetWidth: number,
  sheetHeight: number,
): SpriteRect {
  const sw = Math.max(1, Math.min(Math.round(rect.sw), sheetWidth));
  const sh = Math.max(1, Math.min(Math.round(rect.sh), sheetHeight));
  const sx = Math.max(0, Math.min(Math.round(rect.sx), sheetWidth - sw));
  const sy = Math.max(0, Math.min(Math.round(rect.sy), sheetHeight - sh));
  return { sx, sy, sw, sh };
}

export function bumpSpriteRectField(
  rect: SpriteRect,
  field: BoundsField,
  delta: number,
  sheetWidth: number,
  sheetHeight: number,
): SpriteRect {
  return clampSpriteRect({ ...rect, [field]: rect[field] + delta }, sheetWidth, sheetHeight);
}

export function formatAtlasAssetLine(assetId: string, rect: SpriteRect): string {
  return `${assetId}: { sx: ${rect.sx}, sy: ${rect.sy}, sw: ${rect.sw}, sh: ${rect.sh} },`;
}

export function boundsOverrideKey(atlasId: string, assetId: string): string {
  return `${atlasId}:${assetId}`;
}

export function clientPointToSheet(
  clientX: number,
  clientY: number,
  imageRect: DOMRect,
  sheetWidth: number,
): { x: number; y: number } {
  const scale = imageRect.width / sheetWidth;
  return {
    x: Math.round((clientX - imageRect.left) / scale),
    y: Math.round((clientY - imageRect.top) / scale),
  };
}

export function rectsEqual(a: SpriteRect, b: SpriteRect): boolean {
  return a.sx === b.sx && a.sy === b.sy && a.sw === b.sw && a.sh === b.sh;
}
