/** Session-scoped dice / randomiser. */

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
