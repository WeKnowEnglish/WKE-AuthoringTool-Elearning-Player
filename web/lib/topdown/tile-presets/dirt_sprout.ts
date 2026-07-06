/**
 * Dirt sprout — standalone tile preset.
 * Tuned on /pilots/topdown-sprites.
 */
export const DIRT_SPROUT_PRESET = {
  id: "dirt_sprout",
  label: "Dirt sprout",
  category: "soil" as const,
  imageSrc: "/assets/tiles/dirt-sprout.png",
  width: 1254,
  height: 1254,
  content: { x: 53, y: 44, w: 1155, h: 1177 },
  footprint: { x: 53, y: 44, w: 1155, h: 1067 },
  layout: {
    logicalTilePx: 64,
    lipOverlapPx: 5,
    columnOverlapPx: 2,
  },
} as const;
