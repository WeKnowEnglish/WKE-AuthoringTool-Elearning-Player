import type {
  WkeActivityV2,
  WkeAsset,
  WkeDialogue,
  WkeDialogueTurn,
  WkeHotspotElement,
  WkeHotspotGeometry,
  WkeHotspotVisualShape,
  WkePoint,
} from "@/lib/wke-activity/types";

export type NormalizedPoint = WkePoint;
export type HotspotGeometry = WkeHotspotGeometry;
export type DialogueTurn = WkeDialogueTurn;
export type Dialogue = WkeDialogue;
export type ActivityAssetReference = WkeAsset;
export type ExploreHotspotsDocument = WkeActivityV2;
export type HotspotElement = WkeHotspotElement;
export type HotspotVisualShape = WkeHotspotVisualShape;

export type HotspotHighlight = {
  style: "outline" | "soft-glow" | "spotlight-outline" | string;
  color: string;
  outlineWidth: number;
  glowRadius: number;
  backgroundDim: number;
};
