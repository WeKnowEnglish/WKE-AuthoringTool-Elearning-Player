/**
 * Dirt sprout tall — standalone tile preset.
 * Tuned on /pilots/topdown-sprites.
 */
export const DIRT_SPROUT_TALL_PRESET = {
  id: "dirt_sprout_tall",
  label: "Dirt sprout tall",
  category: "soil" as const,
  imageSrc: "/assets/tiles/dirt-sprout-tall.png",
  width: 1254,
  height: 1254,
  content: { x: 33, y: 34, w: 1195, h: 1207 },
  footprint: { x: 33, y: 34, w: 1195, h: 1107 },
  layout: {
    logicalTilePx: 64,
    lipOverlapPx: 4,
    columnOverlapPx: 2,
  },
} as const;
