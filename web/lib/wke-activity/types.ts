/** Portable EDU Studio `.wkeactivity` authoring document (v2). */

export type WkePoint = { x: number; y: number };

export type WkeHotspotGeometry =
  | { shape: "polygon"; points: WkePoint[] }
  | { shape: "rectangle"; x: number; y: number; width: number; height: number }
  | { shape: "ellipse"; cx: number; cy: number; rx: number; ry: number };

export type WkeAsset = {
  id: string;
  kind: "image" | string;
  src: string;
  mimeType?: string;
  intrinsicSize?: { width: number; height: number };
  alt?: string;
};

export type WkeHotspotVisualShape = {
  type: "segmentation-contour";
  sourceAssetId: string;
  sourceWidth: number;
  sourceHeight: number;
  /** Normalized closed contours. Multiple paths preserve separated parts / holes. */
  paths: WkePoint[][];
  score?: number;
};

export type WkeHotspotElement = {
  id: string;
  kind: "hotspot";
  regionId: string;
  name?: string;
  accessibleLabel?: string;
  geometry: WkeHotspotGeometry;
  tabOrder?: number;
  required?: boolean;
  highlight?: {
    style?: string;
    color?: string;
    outlineWidth?: number;
    glowRadius?: number;
    backgroundDim?: number;
  };
  visualShape?: WkeHotspotVisualShape;
};

export type WkeMediaElement = {
  id: string;
  kind: "media";
  regionId: string;
  assetId: string;
  fit?: "contain" | "cover";
};

export type WkeDialoguePanelElement = {
  id: string;
  kind: "dialogue-panel";
  regionId: string;
  emptyStateText?: string;
  showTranscript?: boolean;
  showReplay?: boolean;
  showProgress?: boolean;
};

export type WkeLayoutElement =
  | WkeHotspotElement
  | WkeMediaElement
  | WkeDialoguePanelElement
  | { id: string; kind: string; [key: string]: unknown };

export type WkeDialogueTurn = {
  speaker: string;
  text: string;
  /** Optional TTS override when no audioUrl. */
  speakText?: string;
  /** Recorded clip URL; preferred over TTS when set. */
  audioUrl?: string;
};

export type WkeDialogue = {
  id: string;
  hotspotId: string;
  title: string;
  turns: WkeDialogueTurn[];
};

export type WkeExploreHotspotsInteraction = {
  type: "explore-hotspots";
  completion: { type: "visit-all-required-hotspots" };
  visitedWhen?: "dialogue-started" | "dialogue-finished" | "dialogue-completed";
  autoPlayOnSelect?: boolean;
  dialogues: WkeDialogue[];
};

export type WkeActivityV2 = {
  version: 2;
  kind: "activity-authoring";
  id: string;
  name: string;
  educationalIntent?: {
    objective?: string;
    successCriteria?: string;
    cefr?: string;
    vocabulary?: string[];
    languageFrames?: string[];
  };
  content: {
    instruction: string;
    completionMessage?: string;
  };
  assets: WkeAsset[];
  layout: {
    aspectRatio?: string;
    responsive?: string;
    regions: Array<{
      id: string;
      role: string;
      widthFraction?: number;
    }>;
    elements: WkeLayoutElement[];
  };
  interaction: WkeExploreHotspotsInteraction;
  accessibility?: {
    keyboardEnabled?: boolean;
    transcriptFallback?: boolean;
    announceProgress?: boolean;
  };
};
