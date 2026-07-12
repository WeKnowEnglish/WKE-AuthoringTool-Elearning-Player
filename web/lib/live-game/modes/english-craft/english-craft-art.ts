/** English Craft map art — Live Games Art Assets pack (1254×1254). */

const ASSET_BASE = "/assets/Live%20Games%20Art%20Assets";

function assetSrc(filename: string): string {
  return `${ASSET_BASE}/${encodeURIComponent(filename)}`;
}

const NATIVE_SIZE_PX = 1254;

export type EnglishCraftResourceType = "wood" | "stone" | "wheat" | "cotton";

export type StorageFillLevel = "empty" | "half" | "full";

export const ENGLISH_CRAFT_ART = {
  tree: assetSrc("tree.png"),
  stump: assetSrc("stump.png"),
  logs: assetSrc("logs.png"),
  stoneFull: assetSrc("stone_full.png"),
  stoneDepleted: assetSrc("stone_depleated.png"),
  stoneResource: assetSrc("stone_resource.png"),
  wheatGrown: assetSrc("wheat_grown.png"),
  wheatHarvested: assetSrc("wheat_harvested.png"),
  wheatResource: assetSrc("wheat_resource.png"),
  cottonGrown: assetSrc("cotton_grown.png"),
  cottonHarvested: assetSrc("cotton_harvested.png"),
  cottonResource: assetSrc("cotton_resource.png"),
  logStorageEmpty: assetSrc("log_storage_empty.png"),
  logStorageHalf: assetSrc("log storage.png"),
  logStorageFull: assetSrc("log storage full.png"),
  stoneStorageEmpty: assetSrc("stone_storage_empty.png"),
  stoneStorageHalf: assetSrc("stone_storage_half.png"),
  stoneStorageFull: assetSrc("stone_storage_full.png"),
  wheatStorageEmpty: assetSrc("wheat_storage_empty.png"),
  wheatStorageHalf: assetSrc("wheat_storage_half.png"),
  wheatStorageFull: assetSrc("wheat_storage_full.png"),
  cottonStorageEmpty: assetSrc("cotton_storage_empty.png"),
  cottonStorageHalf: assetSrc("cotton_storage_half.png"),
  cottonStorageFull: assetSrc("cotton_storage_full.png"),
  workbench: assetSrc("workbench.png"),
  workbenchRubble: assetSrc("workbench rubble.png"),
  hammer: assetSrc("hammer.png"),
  boat: assetSrc("boat.png"),
  backpack: assetSrc("backpack.png"),
  bridgeBuilt: assetSrc("bridge built.png"),
  bridgeUnbuilt: assetSrc("bridge unbuilt.png"),
  flag: assetSrc("flag.png"),
  /** @deprecated Use logStorageHalf — kept for existing imports */
  logStorage: assetSrc("log storage.png"),
} as const;

export function englishCraftArtDisplayHeightPx(displayWidthPx: number): number {
  return displayWidthPx;
}

export function resolveResourceNodeArt(
  resourceType: EnglishCraftResourceType,
  onCooldown: boolean,
): string {
  switch (resourceType) {
    case "wood":
      return onCooldown ? ENGLISH_CRAFT_ART.stump : ENGLISH_CRAFT_ART.tree;
    case "stone":
      return onCooldown ? ENGLISH_CRAFT_ART.stoneDepleted : ENGLISH_CRAFT_ART.stoneFull;
    case "wheat":
      return onCooldown ? ENGLISH_CRAFT_ART.wheatHarvested : ENGLISH_CRAFT_ART.wheatGrown;
    case "cotton":
      return onCooldown ? ENGLISH_CRAFT_ART.cottonHarvested : ENGLISH_CRAFT_ART.cottonGrown;
  }
}

export function resolveCarryArt(resourceType: EnglishCraftResourceType): string {
  switch (resourceType) {
    case "wood":
      return ENGLISH_CRAFT_ART.logs;
    case "stone":
      return ENGLISH_CRAFT_ART.stoneResource;
    case "wheat":
      return ENGLISH_CRAFT_ART.wheatResource;
    case "cotton":
      return ENGLISH_CRAFT_ART.cottonResource;
  }
}

export function resolveStorageArt(
  resourceType: EnglishCraftResourceType,
  level: StorageFillLevel,
): string {
  const table = {
    wood: {
      empty: ENGLISH_CRAFT_ART.logStorageEmpty,
      half: ENGLISH_CRAFT_ART.logStorageHalf,
      full: ENGLISH_CRAFT_ART.logStorageFull,
    },
    stone: {
      empty: ENGLISH_CRAFT_ART.stoneStorageEmpty,
      half: ENGLISH_CRAFT_ART.stoneStorageHalf,
      full: ENGLISH_CRAFT_ART.stoneStorageFull,
    },
    wheat: {
      empty: ENGLISH_CRAFT_ART.wheatStorageEmpty,
      half: ENGLISH_CRAFT_ART.wheatStorageHalf,
      full: ENGLISH_CRAFT_ART.wheatStorageFull,
    },
    cotton: {
      empty: ENGLISH_CRAFT_ART.cottonStorageEmpty,
      half: ENGLISH_CRAFT_ART.cottonStorageHalf,
      full: ENGLISH_CRAFT_ART.cottonStorageFull,
    },
  } as const;
  return table[resourceType][level];
}

export { NATIVE_SIZE_PX as ENGLISH_CRAFT_ART_NATIVE_PX };
