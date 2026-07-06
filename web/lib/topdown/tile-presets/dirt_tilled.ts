/**
 * Dirt tilled — standalone tile preset.
 * Tuned on /pilots/topdown-sprites.
 */
export const DIRT_TILLED_PRESET = {
  id: "dirt_tilled",
  label: "Dirt tilled",
  category: "soil" as const,
  imageSrc: "/assets/tiles/dirt-tilled.png",
  width: 1254,
  height: 1254,
  content: { x: 63, y: 60, w: 1125, h: 1122 },
  footprint: { x: 63, y: 60, w: 1125, h: 1015 },
  layout: {
    logicalTilePx: 64,
    lipOverlapPx: 6,
    columnOverlapPx: 1,
  },
} as const;
