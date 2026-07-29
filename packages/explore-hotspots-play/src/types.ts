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
  presentation?: "target" | "sprite" | "shape" | "text";
  spriteSrc?: string;
  interactionKind?: "dialogue" | "info" | "audio" | "question" | "none" | "silent";
  /** Visible label for text overlays. */
  labelText?: string;
  /** Typography for text overlays. */
  textStyle?: {
    role?: "title" | "body" | "caption";
    align?: "left" | "center" | "right";
  };
  /** Clockwise rotation in degrees around the object center. */
  rotationDeg?: number;
  /** Draw / hit stack order (higher = in front). */
  zIndex?: number;
  /** Declarative entrance + idle motion. */
  animation?: {
    entrance?: "none" | "fade_in" | "pop" | "slide_up" | "slide_down";
    entranceDurationMs?: number;
    entranceDelayMs?: number;
    idle?: "none" | "pulse" | "bob" | "wiggle";
    entranceRequirements?: string[];
  };
  /** Bumps when a gated entrance plays so CSS animation remounts. */
  entranceMotionKey?: number;
  /** Runtime overrides (on-tap stage actions). */
  visible?: boolean;
  opacity?: number;
  /** Gentle idle scale pulse (stage action). */
  pulse?: boolean;
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
