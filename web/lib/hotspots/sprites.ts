import type { HotspotElement, HotspotGeometry } from "@/lib/hotspots/types";

export function isSpriteHotspot(hotspot: HotspotElement): boolean {
  return hotspot.presentation === "sprite";
}

export function isShapeHotspot(hotspot: HotspotElement): boolean {
  return hotspot.presentation === "shape";
}

export function isTextHotspot(hotspot: HotspotElement): boolean {
  return hotspot.presentation === "text";
}

/** Invisible click targets (SAM outline / dialogue regions). */
export function isTargetHotspot(hotspot: HotspotElement): boolean {
  const presentation = hotspot.presentation ?? "target";
  return presentation === "target";
}

export function isSilentOrDecorativeSprite(hotspot: HotspotElement): boolean {
  if (!isSpriteHotspot(hotspot)) return false;
  const kind = hotspot.interactionKind ?? "silent";
  return kind === "none" || kind === "silent";
}

export function defaultSpriteGeometry(
  spriteWidth: number,
  spriteHeight: number,
  mediaWidth: number,
  mediaHeight: number,
): Extract<HotspotGeometry, { shape: "rectangle" }> {
  const heightNorm = 0.18;
  const widthNorm =
    (spriteWidth / spriteHeight) * heightNorm * (mediaHeight / mediaWidth);
  const x = Math.max(0, Math.min(1 - widthNorm, 0.5 - widthNorm / 2));
  const y = Math.max(0, Math.min(1 - heightNorm, 0.5 - heightNorm / 2));
  return {
    shape: "rectangle",
    x,
    y,
    width: widthNorm,
    height: heightNorm,
  };
}

export function spriteRect(
  geometry: HotspotGeometry,
): Extract<HotspotGeometry, { shape: "rectangle" }> | null {
  if (geometry.shape === "rectangle") return geometry;
  if (geometry.shape === "ellipse") {
    return {
      shape: "rectangle",
      x: geometry.cx - geometry.rx,
      y: geometry.cy - geometry.ry,
      width: geometry.rx * 2,
      height: geometry.ry * 2,
    };
  }
  if (geometry.shape === "polygon" && geometry.points.length >= 2) {
    const xs = geometry.points.map((point) => point.x);
    const ys = geometry.points.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return {
      shape: "rectangle",
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }
  return null;
}
