/**
 * Dirt seed watered (planted + watered) — standalone tile preset.
 * File: dit-seedwatered.png. Tuned on /pilots/topdown-sprites.
 */
export const DIRT_SEED_WATERED_PRESET = {
  id: "dirt_seed_watered",
  label: "Dirt seed watered",
  category: "soil" as const,
  imageSrc: "/assets/tiles/dit-seedwatered.png",
  width: 1254,
  height: 1254,
  content: { x: 53, y: 54, w: 1143, h: 1157 },
  footprint: { x: 53, y: 54, w: 1143, h: 1057 },
  layout: {
    logicalTilePx: 64,
    lipOverlapPx: 4,
    columnOverlapPx: 1,
  },
} as const;
