import type { Rect } from "@/lib/teststartpage/chase-game-physics";

export type ChaseDifficultyId = "simple" | "obstacles";

export type ChaseCoinDef = { x: number; y: number; r: number };
export type ChasePlatform = Rect;
export type ChaseHazardKind = "spike" | "lava";
export type ChaseHazard = { x: number; y: number; w: number; h: number; kind: ChaseHazardKind };

export type ChaseLevelDef = {
  worldLength: number;
  /** Max horizontal speed while holding left/right (px per ~60fps frame scaling). */
  playerRunSpeed: number;
  energyDrainPerSec: number;
  platforms: ChasePlatform[];
  coins: ChaseCoinDef[];
  safeX: number;
  safeW: number;
  /** Spikes / lava — only collided when difficulty is `obstacles`. */
  hazards: ChaseHazard[];
};

/** World ground line Y (px); player stands on top. */
export const CHASE_GROUND_Y = 432;

/** Longer runs: wider worlds, spaced platforms, coins, hazards, and safe zones. */
export const CHASE_LEVELS: ChaseLevelDef[] = [
  {
    worldLength: 4600,
    playerRunSpeed: 5.5,
    energyDrainPerSec: 7.2,
    platforms: [
      { x: 620, y: 318, w: 200, h: 22 },
      { x: 1720, y: 268, w: 190, h: 22 },
      { x: 2980, y: 302, w: 200, h: 22 },
      { x: 3880, y: 275, w: 170, h: 22 },
    ],
    coins: [
      { x: 720, y: 296, r: 14 },
      { x: 1280, y: 400, r: 14 },
      { x: 2100, y: 252, r: 14 },
      { x: 2880, y: 298, r: 14 },
      { x: 3520, y: 400, r: 14 },
      { x: 4120, y: 258, r: 14 },
    ],
    safeX: 4240,
    safeW: 130,
    hazards: [
      { x: 980, y: CHASE_GROUND_Y - 22, w: 88, h: 22, kind: "lava" },
      { x: 2180, y: CHASE_GROUND_Y - 34, w: 30, h: 34, kind: "spike" },
      { x: 3380, y: CHASE_GROUND_Y - 22, w: 76, h: 22, kind: "lava" },
      { x: 3920, y: CHASE_GROUND_Y - 34, w: 28, h: 34, kind: "spike" },
    ],
  },
  {
    worldLength: 5400,
    playerRunSpeed: 5.65,
    energyDrainPerSec: 7.8,
    platforms: [
      { x: 520, y: 300, w: 160, h: 22 },
      { x: 1280, y: 238, w: 180, h: 22 },
      { x: 2280, y: 298, w: 200, h: 22 },
      { x: 3380, y: 255, w: 170, h: 22 },
      { x: 4480, y: 305, w: 190, h: 22 },
    ],
    coins: [
      { x: 600, y: 278, r: 14 },
      { x: 1420, y: 218, r: 14 },
      { x: 2480, y: 278, r: 14 },
      { x: 3180, y: 400, r: 14 },
      { x: 3880, y: 238, r: 14 },
      { x: 4680, y: 400, r: 14 },
    ],
    safeX: 5020,
    safeW: 140,
    hazards: [
      { x: 880, y: CHASE_GROUND_Y - 34, w: 30, h: 34, kind: "spike" },
      { x: 1680, y: CHASE_GROUND_Y - 24, w: 96, h: 24, kind: "lava" },
      { x: 2880, y: CHASE_GROUND_Y - 34, w: 30, h: 34, kind: "spike" },
      { x: 3880, y: CHASE_GROUND_Y - 22, w: 104, h: 22, kind: "lava" },
      { x: 4680, y: CHASE_GROUND_Y - 34, w: 28, h: 34, kind: "spike" },
    ],
  },
  {
    worldLength: 6200,
    playerRunSpeed: 5.75,
    energyDrainPerSec: 8.2,
    platforms: [
      { x: 560, y: 328, w: 140, h: 22 },
      { x: 1380, y: 258, w: 200, h: 22 },
      { x: 2380, y: 198, w: 150, h: 22 },
      { x: 3280, y: 298, w: 180, h: 22 },
      { x: 4280, y: 248, w: 160, h: 22 },
      { x: 5180, y: 292, w: 200, h: 22 },
    ],
    coins: [
      { x: 640, y: 306, r: 14 },
      { x: 1520, y: 238, r: 14 },
      { x: 2480, y: 178, r: 14 },
      { x: 3480, y: 278, r: 14 },
      { x: 4480, y: 228, r: 14 },
      { x: 5380, y: 272, r: 14 },
    ],
    safeX: 5820,
    safeW: 150,
    hazards: [
      { x: 920, y: CHASE_GROUND_Y - 22, w: 80, h: 22, kind: "lava" },
      { x: 1880, y: CHASE_GROUND_Y - 36, w: 32, h: 36, kind: "spike" },
      { x: 3080, y: CHASE_GROUND_Y - 24, w: 100, h: 24, kind: "lava" },
      { x: 4180, y: CHASE_GROUND_Y - 34, w: 30, h: 34, kind: "spike" },
      { x: 5280, y: CHASE_GROUND_Y - 22, w: 88, h: 22, kind: "lava" },
    ],
  },
  {
    worldLength: 7000,
    playerRunSpeed: 5.85,
    energyDrainPerSec: 8.6,
    platforms: [
      { x: 480, y: 308, w: 180, h: 22 },
      { x: 1180, y: 248, w: 160, h: 22 },
      { x: 1980, y: 188, w: 140, h: 22 },
      { x: 2880, y: 278, w: 200, h: 22 },
      { x: 3880, y: 218, w: 170, h: 22 },
      { x: 4880, y: 288, w: 190, h: 22 },
      { x: 5880, y: 248, w: 160, h: 22 },
    ],
    coins: [
      { x: 580, y: 286, r: 14 },
      { x: 1380, y: 228, r: 14 },
      { x: 2180, y: 168, r: 14 },
      { x: 3080, y: 258, r: 14 },
      { x: 4080, y: 198, r: 14 },
      { x: 5080, y: 268, r: 14 },
      { x: 6080, y: 400, r: 14 },
    ],
    safeX: 6600,
    safeW: 150,
    hazards: [
      { x: 820, y: CHASE_GROUND_Y - 34, w: 32, h: 34, kind: "spike" },
      { x: 1680, y: CHASE_GROUND_Y - 26, w: 108, h: 26, kind: "lava" },
      { x: 2680, y: CHASE_GROUND_Y - 34, w: 30, h: 34, kind: "spike" },
      { x: 3680, y: CHASE_GROUND_Y - 22, w: 112, h: 22, kind: "lava" },
      { x: 4880, y: CHASE_GROUND_Y - 36, w: 34, h: 36, kind: "spike" },
      { x: 5880, y: CHASE_GROUND_Y - 24, w: 96, h: 24, kind: "lava" },
    ],
  },
  {
    worldLength: 7800,
    playerRunSpeed: 6,
    energyDrainPerSec: 9,
    platforms: [
      { x: 520, y: 318, w: 150, h: 22 },
      { x: 1320, y: 258, w: 200, h: 22 },
      { x: 2280, y: 198, w: 160, h: 22 },
      { x: 3280, y: 308, w: 180, h: 22 },
      { x: 4280, y: 238, w: 170, h: 22 },
      { x: 5280, y: 288, w: 200, h: 22 },
      { x: 6280, y: 268, w: 190, h: 22 },
    ],
    coins: [
      { x: 620, y: 296, r: 14 },
      { x: 1520, y: 238, r: 14 },
      { x: 2480, y: 178, r: 14 },
      { x: 3520, y: 288, r: 14 },
      { x: 4520, y: 218, r: 14 },
      { x: 5520, y: 268, r: 14 },
      { x: 6520, y: 248, r: 14 },
    ],
    safeX: 7380,
    safeW: 160,
    hazards: [
      { x: 920, y: CHASE_GROUND_Y - 24, w: 92, h: 24, kind: "lava" },
      { x: 2080, y: CHASE_GROUND_Y - 36, w: 32, h: 36, kind: "spike" },
      { x: 3180, y: CHASE_GROUND_Y - 22, w: 100, h: 22, kind: "lava" },
      { x: 4280, y: CHASE_GROUND_Y - 34, w: 30, h: 34, kind: "spike" },
      { x: 5380, y: CHASE_GROUND_Y - 26, w: 112, h: 26, kind: "lava" },
      { x: 6480, y: CHASE_GROUND_Y - 34, w: 32, h: 34, kind: "spike" },
    ],
  },
];

export function hazardsForLevel(levelIndex: number, difficulty: ChaseDifficultyId): ChaseHazard[] {
  const L = CHASE_LEVELS[levelIndex];
  if (!L || difficulty !== "obstacles") return [];
  return L.hazards;
}
