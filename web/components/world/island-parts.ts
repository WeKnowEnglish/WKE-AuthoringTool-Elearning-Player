/**
 * Upright props for the World island.
 * Land silhouette and relief live in `island-shape.ts` — not stacked primitives.
 * Keep these props in sync with EDU Studio template id `island`.
 */
export type IslandPartShape = "sphere" | "cylinder";

export type IslandPart = {
  name: string;
  shape: IslandPartShape;
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
  radius: number;
  segments: number;
  height?: number;
  radiusTop?: number;
  radiusBottom?: number;
};

export const ISLAND_PROPS: IslandPart[] = [
  {
    name: "Palm trunk",
    shape: "cylinder",
    position: [0, 0.95, 0],
    scale: [1, 1, 1],
    color: "#92400e",
    radius: 0.07,
    height: 0.82,
    radiusTop: 0.05,
    radiusBottom: 0.07,
    segments: 8,
  },
  {
    name: "Palm crown",
    shape: "sphere",
    position: [0, 1.45, 0],
    scale: [0.46, 0.18, 0.46],
    color: "#15803d",
    radius: 1,
    segments: 12,
  },
  {
    name: "Rock",
    shape: "sphere",
    position: [-0.72, 0.22, 0.18],
    scale: [0.2, 0.14, 0.18],
    color: "#78716c",
    radius: 1,
    segments: 10,
  },
];

/** Degrees on the globe. Island sits on the front so cliffs read from the desk camera. */
export const ISLAND_LANDMARK = {
  id: "world-island",
  lat: -4,
  lon: 0,
  scale: 0.22,
  yaw: 0.85,
};
