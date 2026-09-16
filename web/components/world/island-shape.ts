/**
 * Landmass silhouettes and relief. Each kind is one signed field — not stacked circles.
 */

export const SAND = [0.93, 0.78, 0.42] as const;
export const WET_SAND = [0.84, 0.66, 0.36] as const;
export const GRASS = [0.18, 0.62, 0.28] as const;
export const MEADOW = [0.11, 0.44, 0.2] as const;
export const PEAK = [0.08, 0.3, 0.16] as const;
export const ROCK = [0.36, 0.3, 0.27] as const;
export const CLIFF = [0.48, 0.42, 0.38] as const;
export const DUNE = [0.86, 0.7, 0.4] as const;
export const PINE = [0.07, 0.28, 0.18] as const;

export type LandmassKind = "home" | "crescent" | "ridge" | "twins" | "highland" | "broad" | "stack" | "hook";
export type LandmassZone = "home" | "reading" | "games" | "adventure";

const PLAY_GREEN = [0.34, 0.78, 0.32] as const;

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function smax(a: number, b: number, k: number): number {
  const h = Math.min(1, Math.max(0, 0.5 + (0.5 * (b - a)) / k));
  return a + (b - a) * h + k * h * (1 - h);
}

function smin(a: number, b: number, k: number): number {
  return -smax(-a, -b, k);
}

function ellipse(x: number, z: number, cx: number, cz: number, rx: number, rz: number, rot = 0): number {
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const dx = x - cx;
  const dz = z - cz;
  const lx = (dx * cos + dz * sin) / rx;
  const lz = (-dx * sin + dz * cos) / rz;
  return 1 - Math.hypot(lx, lz);
}

function bump(x: number, z: number, cx: number, cz: number, radius: number, peak: number): number {
  const d = Math.hypot(x - cx, z - cz) / radius;
  if (d >= 1) return 0;
  const t = 1 - d;
  return peak * t * t * (1 + 0.35 * t);
}

function rimNoise(x: number, z: number, field: number, seed: number, amount: number): number {
  const rim = 1 - smoothstep(0.05, 0.32, field);
  const noise =
    0.048 * Math.sin(x * 7.1 + z * 2.6 + seed) * Math.sin(z * 6.2 - x * 1.9 + seed) +
    0.026 * Math.sin(x * 14.8 + z * 10.1 + seed * 1.7) +
    0.014 * Math.sin(x * 24.2 + z * 18.6 + seed);
  return field + noise * amount * rim;
}

function homeField(x: number, z: number): number {
  let field = ellipse(x, z, -0.06, 0.02, 1.16, 0.8, 0.12);
  field = smax(field, ellipse(x, z, 1.02, -0.28, 0.78, 0.26, -0.4), 0.14);
  field = smax(field, ellipse(x, z, -0.98, 0.32, 0.48, 0.34, 0.4), 0.12);
  field = smax(field, ellipse(x, z, -0.16, 0.9, 0.56, 0.3, -0.2), 0.11);
  field = smax(field, ellipse(x, z, 0.06, -0.9, 0.26, 0.48, 0.16), 0.1);
  field = smax(field, ellipse(x, z, -0.72, -0.56, 0.42, 0.26, 0.52), 0.1);
  field = smax(field, ellipse(x, z, 0.66, 0.58, 0.36, 0.24, -0.68), 0.09);
  field = smax(field, ellipse(x, z, 1.32, -0.46, 0.26, 0.14, -0.52), 0.07);
  field = smax(field, ellipse(x, z, 0.68, -0.58, 0.3, 0.22, -0.22), 0.08);
  return rimNoise(x, z, field, 0.8, 1);
}

function crescentField(x: number, z: number): number {
  let field = ellipse(x, z, 0, 0.04, 1.02, 0.46, 0.45);
  field = smin(field, -ellipse(x, z, 0.12, -0.08, 0.58, 0.3, 0.45), 0.09);
  field = smax(field, ellipse(x, z, -0.72, 0.22, 0.22, 0.16, 0.9), 0.07);
  field = smax(field, ellipse(x, z, 0.7, -0.18, 0.2, 0.14, 0.2), 0.06);
  return rimNoise(x, z, field, 2.4, 0.85);
}

function ridgeField(x: number, z: number): number {
  let field = ellipse(x, z, 0, 0, 1.48, 0.26, 0.55);
  field = smax(field, ellipse(x, z, 1.05, 0.18, 0.38, 0.2, -0.15), 0.09);
  field = smax(field, ellipse(x, z, -1.1, -0.16, 0.32, 0.18, 0.4), 0.08);
  field = smax(field, ellipse(x, z, 0.15, 0.22, 0.28, 0.16, 0.1), 0.07);
  return rimNoise(x, z, field, 4.1, 1.15);
}

function twinsField(x: number, z: number): number {
  let field = ellipse(x, z, -0.48, -0.04, 0.42, 0.32, 0.25);
  field = smax(field, ellipse(x, z, 0.52, 0.16, 0.36, 0.28, -0.35), 0.05);
  field = smax(field, ellipse(x, z, 0.02, 0.08, 0.12, 0.08, 0.4), 0.04);
  return rimNoise(x, z, field, 5.6, 0.7);
}

function highlandField(x: number, z: number): number {
  let field = ellipse(x, z, 0, 0, 0.58, 0.5, 0.12);
  field = smax(field, ellipse(x, z, 0.3, -0.22, 0.3, 0.22, 0.5), 0.08);
  field = smax(field, ellipse(x, z, -0.22, 0.28, 0.22, 0.18, -0.3), 0.07);
  return rimNoise(x, z, field, 7.2, 0.9);
}

function broadField(x: number, z: number): number {
  let field = ellipse(x, z, -0.1, 0.05, 1.38, 0.95, 0.18);
  field = smax(field, ellipse(x, z, 0.95, 0.55, 0.78, 0.42, -0.28), 0.16);
  field = smax(field, ellipse(x, z, -0.9, -0.58, 0.62, 0.4, 0.38), 0.13);
  field = smax(field, ellipse(x, z, 0.35, -0.85, 0.4, 0.28, 0.2), 0.1);
  field = smin(field, -ellipse(x, z, 1.42, -0.72, 0.18, 0.12, 0.05), 0.05);
  return rimNoise(x, z, field, 3.3, 0.55);
}

function stackField(x: number, z: number): number {
  let field = ellipse(x, z, 0, 0, 0.34, 0.26, 0.35);
  field = smax(field, ellipse(x, z, 0.24, 0.1, 0.16, 0.13, 0.6), 0.05);
  field = smax(field, ellipse(x, z, -0.16, -0.14, 0.12, 0.1, 0.2), 0.04);
  return rimNoise(x, z, field, 8.8, 0.6);
}

function hookField(x: number, z: number): number {
  let field = ellipse(x, z, -0.08, -0.04, 0.88, 0.52, 0.22);
  field = smax(field, ellipse(x, z, 0.58, 0.58, 0.5, 0.2, 1.15), 0.1);
  field = smax(field, ellipse(x, z, -0.7, -0.35, 0.28, 0.2, 0.5), 0.08);
  field = smin(field, -ellipse(x, z, 0.28, 0.12, 0.26, 0.18, 0.35), 0.07);
  return rimNoise(x, z, field, 1.5, 1);
}

export function landmassField(kind: LandmassKind, x: number, z: number): number {
  switch (kind) {
    case "crescent":
      return crescentField(x, z);
    case "ridge":
      return ridgeField(x, z);
    case "twins":
      return twinsField(x, z);
    case "highland":
      return highlandField(x, z);
    case "broad":
      return broadField(x, z);
    case "stack":
      return stackField(x, z);
    case "hook":
      return hookField(x, z);
    default:
      return homeField(x, z);
  }
}

export function landmassHeight(kind: LandmassKind, x: number, z: number, field: number): number {
  if (field <= 0) return 0;

  const inland = smoothstep(0.018, 0.2, field);
  let height = 0.01 + inland * 0.042;

  if (kind === "home") {
    height += bump(x, z, -0.4, 0.06, 0.44, 0.07);
    height += bump(x, z, -0.18, 0.55, 0.3, 0.036);
    height += bump(x, z, 0.52, -0.2, 0.24, 0.024);
    height += bump(x, z, -0.72, 0.22, 0.22, 0.032);
    height += bump(x, z, 0.56, 0.2, 0.26, 0.02);
    height += bump(x, z, -0.46, 0.24, 0.22, 0.018);
    const cliff = Math.min(1, smoothstep(0.05, -0.45, x) + smoothstep(0.2, 0.72, z) * 0.85);
    if (cliff > 0.15) height = Math.max(height, 0.068 * smoothstep(0.008, 0.11, field) * cliff);
  } else if (kind === "crescent") {
    height = 0.007 + inland * 0.018;
    height += bump(x, z, -0.35, 0.12, 0.4, 0.02);
  } else if (kind === "ridge") {
    height = 0.012 + inland * 0.03;
    height += bump(x, z, 0, 0, 0.9, 0.055);
    height += bump(x, z, 0.8, 0.1, 0.35, 0.04);
    height = Math.max(height, 0.06 * smoothstep(0.01, 0.1, field));
  } else if (kind === "twins") {
    height = 0.008 + inland * 0.022;
    height += bump(x, z, -0.48, -0.04, 0.28, 0.03);
    height += bump(x, z, 0.52, 0.16, 0.24, 0.022);
  } else if (kind === "highland") {
    height = 0.02 + inland * 0.055;
    height += bump(x, z, -0.05, 0.02, 0.4, 0.08);
    height += bump(x, z, 0.22, -0.16, 0.22, 0.045);
  } else if (kind === "broad") {
    height = 0.014 + inland * 0.03;
    height += bump(x, z, -0.12, 0.04, 0.95, 0.028);
    height += bump(x, z, -0.35, 0.1, 0.55, 0.03);
    height += bump(x, z, 0.7, 0.4, 0.4, 0.022);
    height += bump(x, z, -0.7, -0.4, 0.36, 0.02);
  } else if (kind === "stack") {
    height = 0.018 + inland * 0.05;
    height += bump(x, z, 0, 0, 0.22, 0.055);
    height = Math.max(height, 0.07 * smoothstep(0.01, 0.12, field));
  } else if (kind === "hook") {
    height = 0.01 + inland * 0.034;
    height += bump(x, z, -0.15, -0.05, 0.4, 0.045);
    height += bump(x, z, 0.5, 0.5, 0.28, 0.028);
  }

  return height;
}

export function landmassColor(
  kind: LandmassKind,
  x: number,
  z: number,
  field: number,
  height: number,
  slope: number,
  zone: LandmassZone = "adventure",
): [number, number, number] {
  const cliffBias = kind === "ridge" || kind === "stack" || kind === "highland" ? 0.38 : 0.62;
  const westCliff = kind === "home" ? smoothstep(0.1, -0.4, x) : 0;
  const northCliff = kind === "home" ? smoothstep(0.28, 0.75, z) : 0;
  const cliffBand = Math.min(1, westCliff + northCliff) * smoothstep(0.14, 0.03, field);

  if (slope > cliffBias || cliffBand > 0.45 || (kind === "stack" && field < 0.16)) {
    return mix(ROCK, CLIFF, Math.min(1, slope));
  }

  if (kind === "crescent") {
    if (field < 0.14) return mix(WET_SAND, DUNE, smoothstep(0.02, 0.14, field));
    return mix(DUNE, GRASS, smoothstep(0.14, 0.28, field));
  }

  if (kind === "highland") {
    if (field < 0.07 && height < 0.03) return mix(ROCK, SAND, 0.35);
    if (height > 0.08) return PINE.slice() as [number, number, number];
    return mix(MEADOW, PINE, smoothstep(0.03, 0.08, height));
  }

  if (kind === "broad") {
    if (field < 0.07 && height < 0.024) return mix(WET_SAND, SAND, smoothstep(0.015, 0.07, field));
    return mix(GRASS, MEADOW, smoothstep(0.02, 0.055, height));
  }

  if (field < 0.06 && height < 0.022) return mix(WET_SAND, SAND, smoothstep(0.012, 0.06, field));
  if (field < 0.11 && height < 0.03) return mix(SAND, GRASS, smoothstep(0.06, 0.11, field));
  if (height > 0.072) return PEAK.slice() as [number, number, number];
  if (height > 0.042) return mix(MEADOW, PEAK, smoothstep(0.042, 0.072, height));
  const grass = mix(GRASS, MEADOW, smoothstep(0.02, 0.042, height));
  if (zone === "reading") return mix(grass, DUNE, 0.28);
  if (zone === "games") return mix(grass, PLAY_GREEN, 0.45);
  return grass;
}

export function islandField(x: number, z: number): number {
  return landmassField("home", x, z);
}

export function islandHeight(x: number, z: number, field: number): number {
  return landmassHeight("home", x, z, field);
}

export function islandColor(x: number, z: number, field: number, height: number, slope: number): [number, number, number] {
  return landmassColor("home", x, z, field, height, slope);
}

function mix(a: readonly [number, number, number], b: readonly [number, number, number], t: number): [number, number, number] {
  const k = Math.min(1, Math.max(0, t));
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}
