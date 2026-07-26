export type NormalizedPoint = { x: number; y: number };

export type HotspotGeometry =
  | { shape: "rectangle"; x: number; y: number; width: number; height: number }
  | { shape: "ellipse"; cx: number; cy: number; rx: number; ry: number }
  | { shape: "polygon"; points: NormalizedPoint[] };

export type PixelPoint = { x: number; y: number; label?: 1 | 0 };

export type MaskPostprocessOptions = {
  /** When false, enclosed background cavities are left open (better for rings / exclude). Default true. */
  fillSmallHoles?: boolean;
  maxHoleArea?: number;
  /** Pixel radius carved around exclude prompts after component cleanup. Default 0. */
  excludeCarveRadius?: number;
};
