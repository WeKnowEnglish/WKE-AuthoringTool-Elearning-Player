import {
  AJ_PUPPET_CANVAS_HEIGHT,
  AJ_PUPPET_CANVAS_WIDTH,
  ajPuppetAssetPath,
} from "../assets";
import type { PuppetRigDefinition } from "../types";

/** AJ — first batch (`fixed` set), single 2480×3508 artboard per layer. */
export const DEFAULT_HOST: PuppetRigDefinition = {
  id: "default_host",
  label: "AJ",
  canvasWidth: AJ_PUPPET_CANVAS_WIDTH,
  canvasHeight: AJ_PUPPET_CANVAS_HEIGHT,
  parts: {
    body: { src: ajPuppetAssetPath("Body fixed.png") },
    head: { src: ajPuppetAssetPath("Head fixed.png") },
    /** File name says "Lower arm fixed"; this is the upper arm on the waving side. */
    upperArm: { src: ajPuppetAssetPath("Lower arm fixed.png") },
    lowerArm: { src: ajPuppetAssetPath("Lower arm.png") },
    hand: { src: ajPuppetAssetPath("Hand.png") },
  },
  pivots: {
    body: "46% 69%",
    head: "46% 40%",
    upperArm: "55% 47%",
    lowerArm: "69% 57%",
    hand: "69% 43%",
  },
};

export function getDefaultHostPartSrcList(): string[] {
  return Object.values(DEFAULT_HOST.parts).map((p) => p.src);
}
