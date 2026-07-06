/**
 * Dirt fruit grown (harvest-ready) — standalone tile preset.
 * Tuned on /pilots/topdown-sprites.
 */
export const DIRT_FRUIT_GROWN_PRESET = {
  id: "dirt_fruit_grown",
  label: "Dirt fruit grown",
  category: "soil" as const,
  imageSrc: "/assets/tiles/dirt-fruit-grown.png",
  width: 1254,
  height: 1254,
  content: { x: 16, y: 14, w: 1218, h: 1238 },
  footprint: { x: 16, y: 14, w: 1218, h: 1165 },
  layout: {
    logicalTilePx: 64,
    lipOverlapPx: 2,
    columnOverlapPx: 2,
  },
} as const;
