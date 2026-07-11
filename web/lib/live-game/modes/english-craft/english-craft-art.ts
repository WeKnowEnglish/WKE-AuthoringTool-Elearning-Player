/** English Craft map art — Live Games Art Assets pack (1254×1254). */

const ASSET_BASE = "/assets/Live%20Games%20Art%20Assets";

function assetSrc(filename: string): string {
  return `${ASSET_BASE}/${encodeURIComponent(filename)}`;
}

const NATIVE_SIZE_PX = 1254;

export const ENGLISH_CRAFT_ART = {
  tree: assetSrc("tree.png"),
  stump: assetSrc("stump.png"),
  workbench: assetSrc("workbench.png"),
  bridgeBuilt: assetSrc("bridge built.png"),
  bridgeUnbuilt: assetSrc("bridge unbuilt.png"),
  flag: assetSrc("flag.png"),
  logs: assetSrc("logs.png"),
  logStorage: assetSrc("log storage.png"),
} as const;

export function englishCraftArtDisplayHeightPx(displayWidthPx: number): number {
  return displayWidthPx;
}

export { NATIVE_SIZE_PX as ENGLISH_CRAFT_ART_NATIVE_PX };
