import type { SpriteAtlasConfig, SpriteRect } from "@/lib/topdown/types";

export function spriteBackgroundPosition(rect: SpriteRect): string {
  return `-${rect.sx}px -${rect.sy}px`;
}

export function spriteBackgroundSize(
  atlas: Pick<SpriteAtlasConfig, "width" | "height">,
): string {
  return `${atlas.width}px ${atlas.height}px`;
}

export function spriteScaleToWidth(rect: SpriteRect, displayWidthPx: number): number {
  return displayWidthPx / rect.sw;
}

export function getAtlasRect(
  atlas: SpriteAtlasConfig,
  assetId: string,
): SpriteRect | undefined {
  return atlas.assets[assetId];
}
