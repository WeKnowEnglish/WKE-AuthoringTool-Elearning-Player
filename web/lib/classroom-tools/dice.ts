/** Shared classroom dice / randomiser. Used by VC and teacher toolkit. */

export type DicePreset = "d6" | "2d6" | "d10" | "d20" | "custom" | "labels";

export type DiceRoll = {
  at: number;
  values: number[];
  labels: string[];
  total: number;
  visibility: "class" | "teacher";
};

export type RandomiserState = {
  preset: DicePreset;
  sides: number;
  diceCount: number;
  labels: string[];
  visibility: "class" | "teacher";
  locked: boolean;
  lastRoll: DiceRoll | null;
  history: DiceRoll[];
};

function normalizeDiceRoll(value: unknown): DiceRoll | null {
  if (!value || typeof value !== "object") return null;
  const roll = value as Partial<DiceRoll>;
  if (
    typeof roll.at !== "number" ||
    !Number.isFinite(roll.at) ||
    !Array.isArray(roll.values) ||
    !roll.values.every((item) => typeof item === "number" && Number.isFinite(item)) ||
    !Array.isArray(roll.labels) ||
    !roll.labels.every((item) => typeof item === "string") ||
    typeof roll.total !== "number" ||
    !Number.isFinite(roll.total) ||
    (roll.visibility !== "class" && roll.visibility !== "teacher")
  ) {
    return null;
  }
  return {
    at: roll.at,
    values: roll.values,
    labels: roll.labels,
    total: roll.total,
    visibility: roll.visibility,
  };
}

export function normalizeRandomiserState(value: unknown): RandomiserState | null {
  if (!value || typeof value !== "object") return null;
  const state = value as Partial<RandomiserState>;
  const validPresets: DicePreset[] = ["d6", "2d6", "d10", "d20", "custom", "labels"];
  if (
    !state.preset ||
    !validPresets.includes(state.preset) ||
    typeof state.sides !== "number" ||
    !Number.isFinite(state.sides) ||
    typeof state.diceCount !== "number" ||
    !Number.isFinite(state.diceCount) ||
    !Array.isArray(state.labels) ||
    !state.labels.every((item) => typeof item === "string") ||
    (state.visibility !== "class" && state.visibility !== "teacher") ||
    typeof state.locked !== "boolean" ||
    !Array.isArray(state.history)
  ) {
    return null;
  }
  const lastRoll = state.lastRoll === null ? null : normalizeDiceRoll(state.lastRoll);
  if (state.lastRoll !== null && !lastRoll) return null;
  const history = state.history.map(normalizeDiceRoll);
  if (history.some((roll) => !roll)) return null;
  return {
    preset: state.preset,
    sides: state.sides,
    diceCount: state.diceCount,
    labels: state.labels,
    visibility: state.visibility,
    locked: state.locked,
    lastRoll,
    history: history as DiceRoll[],
  };
}

export function createEmptyRandomiser(): RandomiserState {
  return {
    preset: "d6",
    sides: 6,
    diceCount: 1,
    labels: [],
    visibility: "class",
    locked: false,
    lastRoll: null,
    history: [],
  };
}

export function configureRandomiser(
  state: RandomiserState,
  patch: Partial<
    Pick<
      RandomiserState,
      "preset" | "sides" | "diceCount" | "labels" | "visibility" | "locked"
    >
  >,
): RandomiserState {
  let next: RandomiserState = { ...state, ...patch };

  switch (patch.preset ?? state.preset) {
    case "d6":
      next = { ...next, preset: "d6", sides: 6, diceCount: 1, labels: [] };
      break;
    case "2d6":
      next = { ...next, preset: "2d6", sides: 6, diceCount: 2, labels: [] };
      break;
    case "d10":
      next = { ...next, preset: "d10", sides: 10, diceCount: 1, labels: [] };
      break;
    case "d20":
      next = { ...next, preset: "d20", sides: 20, diceCount: 1, labels: [] };
      break;
    case "custom":
      next = {
        ...next,
        preset: "custom",
        sides: Math.max(2, Math.min(100, patch.sides ?? state.sides)),
        diceCount: Math.max(1, Math.min(6, patch.diceCount ?? state.diceCount)),
        labels: [],
      };
      break;
    case "labels": {
      const labels = (patch.labels ?? state.labels)
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 24);
      next = {
        ...next,
        preset: "labels",
        sides: Math.max(2, labels.length || 2),
        diceCount: 1,
        labels,
      };
      break;
    }
    default:
      break;
  }

  return next;
}

function rollDie(sides: number, random: () => number): number {
  return Math.floor(random() * sides) + 1;
}

/** Small deterministic generator so optimistic and authoritative rolls match. */
export function createSeededDiceRandom(seed: number): () => number {
  let state = (Number.isFinite(seed) ? Math.floor(seed) : 0) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function rollDice(
  state: RandomiserState,
  options?: { random?: () => number; nowMs?: number },
): RandomiserState {
  if (state.locked) return state;
  const random = options?.random ?? Math.random;
  const at = options?.nowMs ?? Date.now();

  if (state.preset === "labels") {
    if (state.labels.length === 0) return state;
    const index = Math.floor(random() * state.labels.length);
    const label = state.labels[index]!;
    const roll: DiceRoll = {
      at,
      values: [index + 1],
      labels: [label],
      total: index + 1,
      visibility: state.visibility,
    };
    return {
      ...state,
      lastRoll: roll,
      history: [roll, ...state.history].slice(0, 30),
    };
  }

  const values: number[] = [];
  for (let i = 0; i < state.diceCount; i += 1) {
    values.push(rollDie(state.sides, random));
  }
  const roll: DiceRoll = {
    at,
    values,
    labels: values.map(String),
    total: values.reduce((a, b) => a + b, 0),
    visibility: state.visibility,
  };
  return {
    ...state,
    lastRoll: roll,
    history: [roll, ...state.history].slice(0, 30),
  };
}

export function clearLastRoll(state: RandomiserState): RandomiserState {
  return { ...state, lastRoll: null };
}
