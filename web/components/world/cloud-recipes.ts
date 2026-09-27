export type CloudLobe = {
  position: [number, number, number];
  scale: [number, number, number];
};

export type CloudKind = "wisp" | "bank" | "cover";

export type CloudClusterRecipe = {
  lat: number;
  lon: number;
  radius: number;
  kind: CloudKind;
  opacity: number;
  tint?: string;
  yaw?: number;
};

const WISP_LOBES: CloudLobe[] = [
  { position: [0, 0.01, 0], scale: [0.09, 0.042, 0.078] },
  { position: [0.055, 0.016, 0.018], scale: [0.07, 0.036, 0.06] },
  { position: [-0.05, 0.012, -0.016], scale: [0.064, 0.032, 0.054] },
  { position: [0.016, 0.024, -0.046], scale: [0.05, 0.028, 0.048] },
  { position: [0.038, 0.01, 0.048], scale: [0.044, 0.024, 0.04] },
  { position: [-0.03, 0.02, 0.03], scale: [0.038, 0.02, 0.034] },
];

const BANK_LOBES: CloudLobe[] = [
  { position: [0, 0.012, 0], scale: [0.13, 0.055, 0.1] },
  { position: [0.08, 0.02, 0.03], scale: [0.1, 0.046, 0.082] },
  { position: [-0.075, 0.016, -0.02], scale: [0.095, 0.042, 0.078] },
  { position: [0.03, 0.03, -0.07], scale: [0.078, 0.038, 0.07] },
  { position: [-0.04, 0.018, 0.07], scale: [0.072, 0.034, 0.064] },
  { position: [0.1, 0.01, -0.04], scale: [0.058, 0.028, 0.05] },
  { position: [-0.1, 0.014, 0.04], scale: [0.055, 0.026, 0.048] },
  { position: [0.02, 0.034, 0.02], scale: [0.05, 0.03, 0.046] },
];

const COVER_LOBES: CloudLobe[] = [
  { position: [0, 0.014, 0], scale: [0.16, 0.068, 0.13] },
  { position: [0.1, 0.022, 0.04], scale: [0.12, 0.052, 0.1] },
  { position: [-0.1, 0.02, -0.03], scale: [0.118, 0.05, 0.096] },
  { position: [0.04, 0.036, -0.08], scale: [0.1, 0.046, 0.086] },
  { position: [-0.05, 0.024, 0.09], scale: [0.095, 0.042, 0.08] },
  { position: [0.13, 0.012, -0.05], scale: [0.078, 0.034, 0.066] },
  { position: [-0.13, 0.016, 0.05], scale: [0.074, 0.032, 0.062] },
  { position: [0.02, 0.042, 0.02], scale: [0.07, 0.04, 0.064] },
  { position: [0.07, 0.01, 0.08], scale: [0.06, 0.028, 0.052] },
  { position: [-0.06, 0.012, -0.09], scale: [0.058, 0.026, 0.05] },
];

export const CLOUD_LOBES: Record<CloudKind, CloudLobe[]> = {
  wisp: WISP_LOBES,
  bank: BANK_LOBES,
  cover: COVER_LOBES,
};

/** Keep these off the four hubs so land and houses stay readable. */
export const DECORATIVE_CLOUDS: CloudClusterRecipe[] = [
  { lat: 28, lon: 42, radius: 1.13, kind: "wisp", opacity: 0.5, tint: "#f8fafc" },
  { lat: -38, lon: 32, radius: 1.14, kind: "wisp", opacity: 0.42, tint: "#e0f2fe" },
  { lat: 42, lon: -38, radius: 1.12, kind: "bank", opacity: 0.46, tint: "#f8fafc" },
  { lat: -52, lon: -70, radius: 1.13, kind: "wisp", opacity: 0.4, tint: "#fef3c7" },
  { lat: 32, lon: 72, radius: 1.15, kind: "bank", opacity: 0.44, tint: "#f8fafc" },
  { lat: 8, lon: -70, radius: 1.14, kind: "wisp", opacity: 0.4, tint: "#e0f2fe" },
];

export function coverAround(lat: number, lon: number): CloudClusterRecipe[] {
  return [
    { lat, lon, radius: 1.12, kind: "cover", opacity: 0.7, tint: "#f8fafc" },
    { lat: lat + 5, lon: lon + 7, radius: 1.1, kind: "bank", opacity: 0.56, tint: "#e2e8f0" },
    { lat: lat - 6, lon: lon - 6, radius: 1.16, kind: "bank", opacity: 0.58, tint: "#f8fafc" },
    { lat: lat + 2, lon: lon - 10, radius: 1.08, kind: "wisp", opacity: 0.48, tint: "#e0f2fe" },
  ];
}
