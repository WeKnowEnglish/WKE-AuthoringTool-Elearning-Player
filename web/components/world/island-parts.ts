/**
 * World island landmark recipe.
 * Keep in sync with EDU Studio Shape Builder template id `island`
 * (`WKE Animator/svg-edu-studio` → Starter templates → World island).
 * Local +Y is up on the Studio desk. On the globe, land blobs wrap as
 * spherical caps; palm and rock stay upright on the local surface.
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

export const ISLAND_PARTS: IslandPart[] = [
  { name: "Beach", shape: "sphere", position: [0, 0.07, 0], scale: [1.85, 0.14, 1.15], color: "#f4d58d", radius: 1, segments: 16 },
  { name: "Mainland", shape: "sphere", position: [-0.04, 0.2, 0.04], scale: [1.35, 0.26, 0.82], color: "#22c55e", radius: 1, segments: 16 },
  { name: "Peninsula", shape: "sphere", position: [0.92, 0.14, -0.12], scale: [0.78, 0.16, 0.36], color: "#16a34a", radius: 1, segments: 14 },
  { name: "Hill", shape: "sphere", position: [-0.5, 0.4, 0.12], scale: [0.46, 0.44, 0.4], color: "#15803d", radius: 1, segments: 14 },
  { name: "Peak", shape: "sphere", position: [-0.5, 0.68, 0.12], scale: [0.2, 0.2, 0.18], color: "#166534", radius: 1, segments: 12 },
  {
    name: "Palm trunk",
    shape: "cylinder",
    position: [0.5, 0.52, 0.22],
    scale: [1, 1, 1],
    color: "#92400e",
    radius: 0.07,
    height: 0.82,
    radiusTop: 0.05,
    radiusBottom: 0.07,
    segments: 8,
  },
  { name: "Palm crown", shape: "sphere", position: [0.5, 1.02, 0.22], scale: [0.46, 0.18, 0.46], color: "#15803d", radius: 1, segments: 12 },
  { name: "Rock", shape: "sphere", position: [-1.02, 0.16, -0.28], scale: [0.2, 0.14, 0.18], color: "#78716c", radius: 1, segments: 10 },
];

/** Degrees on the globe. Island faces the starting camera. */
export const ISLAND_LANDMARK = {
  id: "world-island",
  lat: 8,
  lon: 0,
  scale: 0.22,
  yaw: 0.85,
};
