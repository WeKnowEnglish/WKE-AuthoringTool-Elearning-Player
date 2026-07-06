/**
 * Dirt 1 — standalone tile preset.
 * Tuned on /pilots/topdown-sprites.
 */
export const DIRT_1_PRESET = {
  id: "dirt_1",
  label: "Dirt 1",
  category: "soil" as const,
  imageSrc: "/assets/tiles/dirt-1.png",
  width: 1254,
  height: 1254,
  content: { x: 73, y: 74, w: 1105, h: 1097 },
  footprint: { x: 73, y: 74, w: 1105, h: 967 },
  layout: {
    logicalTilePx: 64,
    lipOverlapPx: 6,
    columnOverlapPx: 1,
  },
} as const;
