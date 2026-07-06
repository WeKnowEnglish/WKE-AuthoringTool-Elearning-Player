import type { CSSProperties } from "react";
import type { SpriteAtlasConfig, SpriteRect } from "@/lib/topdown/types";

export function spriteBackgroundPosition(rect: SpriteRect): string {
  return `-${rect.sx}px -${rect.sy}px`;
}

export function spriteBackgroundSize(
  atlas: Pick<SpriteAtlasConfig, "width" | "height">,
): string {
  return `${atlas.width}px ${atlas.height}px`;
}

/** Scale sheet UV math when the element is sized in display pixels, not atlas pixels. */
export function spriteBackgroundPositionScaled(rect: SpriteRect, scale: number): string {
  return `-${rect.sx * scale}px -${rect.sy * scale}px`;
}

export function spriteBackgroundSizeScaled(
  atlas: Pick<SpriteAtlasConfig, "width" | "height">,
  scale: number,
): string {
  return `${atlas.width * scale}px ${atlas.height * scale}px`;
}

export function spriteScaleToWidth(rect: SpriteRect, displayWidthPx: number): number {
  return displayWidthPx / rect.sw;
}

/** Scale so the full crop fits inside a square display box. */
export function spriteScaleToFit(rect: SpriteRect, maxDisplayPx: number): number {
  return maxDisplayPx / Math.max(rect.sw, rect.sh);
}

export function getAtlasRect(
  atlas: SpriteAtlasConfig,
  assetId: string,
): SpriteRect | undefined {
  return atlas.assets[assetId];
}

/** Crop-sized layer: native sw×sh box + transform scale (matches TopDownSprite non-fillCell). */
export function atlasCropLayerStyle(
  atlas: Pick<SpriteAtlasConfig, "imageSrc" | "width" | "height">,
  bounds: SpriteRect,
  scale: number,
): CSSProperties {
  return {
    width: bounds.sw,
    height: bounds.sh,
    backgroundImage: `url("${atlas.imageSrc}")`,
    backgroundPosition: spriteBackgroundPosition(bounds),
    backgroundSize: spriteBackgroundSize(atlas),
    backgroundRepeat: "no-repeat",
    transform: `scale(${scale})`,
    transformOrigin: "top left",
  };
}

/** Scaled background on a div already sized to bounds.sw×scale by bounds.sh×scale. */
export function atlasCropBackgroundStyleScaled(
  atlas: Pick<SpriteAtlasConfig, "imageSrc" | "width" | "height">,
  bounds: SpriteRect,
  scale: number,
): CSSProperties {
  return {
    width: Math.round(bounds.sw * scale),
    height: Math.round(bounds.sh * scale),
    backgroundImage: `url("${atlas.imageSrc}")`,
    backgroundPosition: spriteBackgroundPositionScaled(bounds, scale),
    backgroundSize: spriteBackgroundSizeScaled(atlas, scale),
    backgroundRepeat: "no-repeat",
  };
}

/** Snap near-miss autodetect sizes back to the atlas file dimensions. */
export function snapDetectedBoundsToCanonical(
  detected: SpriteRect,
  canonical: SpriteRect,
  sheetWidth: number,
  sheetHeight: number,
  tolerancePx = 16,
): SpriteRect {
  if (
    Math.abs(detected.sw - canonical.sw) > tolerancePx ||
    Math.abs(detected.sh - canonical.sh) > tolerancePx
  ) {
    return detected;
  }
  return {
    sx: Math.max(0, Math.min(detected.sx, sheetWidth - canonical.sw)),
    sy: Math.max(0, Math.min(detected.sy, sheetHeight - canonical.sh)),
    sw: canonical.sw,
    sh: canonical.sh,
  };
}
