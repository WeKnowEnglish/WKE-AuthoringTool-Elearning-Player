/**
 * Dirt planted — standalone tile preset.
 * Tuned on /pilots/topdown-sprites.
 */
export const DIRT_PLANTED_PRESET = {
  id: "dirt_planted",
  label: "Dirt planted",
  category: "soil" as const,
  imageSrc: "/assets/tiles/dirt-planted.png",
  width: 1254,
  height: 1254,
  content: { x: 103, y: 80, w: 1046, h: 1097 },
  footprint: { x: 103, y: 80, w: 1046, h: 967 },
  layout: {
    logicalTilePx: 64,
    lipOverlapPx: 3,
    columnOverlapPx: 2,
  },
} as const;
