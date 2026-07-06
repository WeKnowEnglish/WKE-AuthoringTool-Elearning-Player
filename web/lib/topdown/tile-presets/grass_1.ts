/**
 * Grass 1 — standalone tile preset.
 * Tuned on /pilots/topdown-sprites.
 */
export const GRASS_1_PRESET = {
  id: "grass_1",
  label: "Grass 1",
  category: "grass" as const,
  imageSrc: "/assets/tiles/grass-1.png",
  width: 1024,
  height: 1024,
  content: { x: 133, y: 155, w: 756, h: 789 },
  footprint: { x: 133, y: 155, w: 756, h: 679 },
  layout: {
    logicalTilePx: 64,
    lipOverlapPx: 5,
    columnOverlapPx: 1,
  },
} as const;
