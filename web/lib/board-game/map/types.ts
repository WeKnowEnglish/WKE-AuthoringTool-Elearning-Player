/** Visual / gameplay theme applied to the board canvas. */
export type MapThemeId = "classroom" | "jungle" | "space" | "ocean" | "castle";

/** Matches SpaceKind in types.ts (kept local to avoid circular imports). */
export type MapSpaceKind = "normal" | "bonus" | "treasure" | "mystery" | "jump" | "trap";

/** Matches SpaceEffectType in types.ts (kept local to avoid circular imports). */
export type MapSpaceEffectType =
  | "moveAhead3"
  | "moveBack2"
  | "rollAgain"
  | "stealPoint"
  | "skipTurn"
  | "swapLeader";

/** Automatic layout used when generating a map from space count. */
export type MapLayoutTemplate = "snake" | "spiral" | "island";

/**
 * Square type in the map schema. Most gameplay still uses `kind` + `effect`
 * (legacy lucky-space engine) until Phase 3 wires per-square onCorrect/onWrong.
 */
export type MapSpaceType =
  | "start"
  | "normal"
  | "question"
  | "bonus"
  | "penalty"
  | "moveForward"
  | "moveBackward"
  | "skipTurn"
  | "rollAgain"
  | "shortcutStart"
  | "shortcutEnd"
  | "finish";

export type MapSpaceEffect = {
  onLand?: MapSpaceEffectType;
  onCorrect?: MapSpaceEffectType;
  onWrong?: MapSpaceEffectType;
  /** Score change applied on land (legacy / generator). */
  points?: number;
  moveAmount?: number;
  /** Score change when the teacher marks correct. */
  correctPoints?: number;
  /** Score change when the teacher marks wrong (negative values penalize). */
  wrongPoints?: number;
};

export type BoardMapSpace = {
  id: number;
  label: string;
  type: MapSpaceType;
  /** Grid cell for rendering (0-based). */
  grid: { col: number; row: number };
  icon?: string;
  /** Drives lucky-space resolution in the current engine. */
  kind?: MapSpaceKind;
  effect?: MapSpaceEffectType;
  effects?: MapSpaceEffect;
  questionCategory?: string;
};

export type BoardConnection = {
  from: number;
  to: number;
  type: "shortcut" | "bridge" | "tunnel";
};

/**
 * Teacher-authored board map. Movement uses pathOrder: path index 0 = start,
 * path index pathOrder.length - 1 = finish (matches existing playerPositions).
 */
export type BoardMap = {
  schemaVersion: 1;
  id: string;
  title: string;
  theme: MapThemeId;
  layoutTemplate: MapLayoutTemplate;
  /** Ordered space ids from start to finish. */
  pathOrder: number[];
  spaces: BoardMapSpace[];
  connections: BoardConnection[];
};

export type GenerateMapOptions = {
  id: string;
  title: string;
  theme?: MapThemeId;
  layoutTemplate: MapLayoutTemplate;
  /** Number of steps from start to finish (finish path index). */
  boardLength: number;
  random?: () => number;
};
