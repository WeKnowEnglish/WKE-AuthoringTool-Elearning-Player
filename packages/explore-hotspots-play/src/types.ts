export type NormalizedPoint = { x: number; y: number };

export type HotspotGeometry =
  | { shape: "rectangle"; x: number; y: number; width: number; height: number }
  | { shape: "ellipse"; cx: number; cy: number; rx: number; ry: number }
  | { shape: "polygon"; points: NormalizedPoint[] };

export type HotspotVisualShape = {
  type: "segmentation-contour";
  sourceAssetId: string;
  sourceWidth: number;
  sourceHeight: number;
  /** Normalized closed contours. Multiple paths preserve separated parts / holes. */
  paths: NormalizedPoint[][];
  score?: number;
};

export type HotspotHighlight = {
  style: "outline" | "soft-glow" | "spotlight-outline" | string;
  color: string;
  outlineWidth: number;
  glowRadius: number;
  backgroundDim: number;
};

export type PlayHotspot = {
  id: string;
  accessibleLabel?: string;
  /** Lower numbers come first for keyboard tab order. */
  tabOrder?: number;
  geometry: HotspotGeometry;
  visualShape?: HotspotVisualShape;
  highlight?: Partial<HotspotHighlight>;
};

export type PlayMedia = {
  src: string;
  alt?: string;
  intrinsicWidth?: number;
  intrinsicHeight?: number;
};

export const DEFAULT_HOTSPOT_HIGHLIGHT: HotspotHighlight = {
  style: "spotlight-outline",
  color: "#fbbf24",
  outlineWidth: 5,
  glowRadius: 10,
  backgroundDim: 0.14,
};
