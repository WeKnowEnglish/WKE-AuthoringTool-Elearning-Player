import type { ExploreGate, ExplorePayload } from "@/lib/lesson-schemas";
import type { Rect } from "@/lib/teststartpage/chase-game-physics";

/** Design-time canvas height; world Y coords are scaled to fit the real canvas. */
export const EXPLORE_DESIGN_VIEW_H = 480;
export const EXPLORE_GROUND_Y = 432;
export const EXPLORE_PLAYER_W = 48;
export const EXPLORE_PLAYER_H = 56;
/** Loop 2: watch-only obstacle clip (jump / stumble). */
export const EXPLORE_GATE_RESOLVE_MS = 1650;
export const EXPLORE_OBSTACLE_OFFSET_X = 72;
/** Player spawn world X. */
export const EXPLORE_PLAYER_START_X = 100;
/** Running time before the first gate (countdown + sprint follow on UI). */
export const EXPLORE_FIRST_GATE_RUN_IN_SEC = 1.25;
/** Running time between finishing one gate and starting the next. */
export const EXPLORE_GATE_BETWEEN_SEC = 1.5;
/** Speed while spelling during a gate (1 = full run speed). */
export const EXPLORE_GATE_QUIZ_SPEED_MUL = 1;
/** Camera: player horizontal position as fraction of visible world width. */
export const EXPLORE_CAMERA_PLAYER_FRAC = 0.35;

export type ExploreRunMode =
  | "running"
  | "gateQuiz"
  | "gateResolve"
  | "encounter"
  | "complete";

export type ExploreGateOutcome = "dodge" | "hit";

export type ExploreHazard = {
  gateIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: "spike" | "lava";
  cleared: boolean;
};

export type ResolvedExploreGate = ExploreGate & {
  world_x: number;
  gateIndex: number;
  /** World X at which the spell quiz opens (runner still moving toward hazard). */
  approach_world_x: number;
};

export type ExploreRunConfig = {
  worldLength: number;
  scrollSpeedPxPerSec: number;
  gates: ResolvedExploreGate[];
  hazards: ExploreHazard[];
};

export type ExploreRunState = {
  mode: ExploreRunMode;
  playerX: number;
  playerY: number;
  activeGateIndex: number;
  gatesCleared: number;
  gateOutcome: ExploreGateOutcome | null;
  resolveStartedAtMs: number | null;
  hitFlashUntilMs: number | null;
  scrollSpeedMul: number;
};

export function resolveGateWorldPositions(
  gates: ExploreGate[],
  worldLength: number,
  scrollSpeedPxPerSec = 140,
): number[] {
  const n = gates.length;
  if (n === 0) return [];
  const maxX = worldLength - 120;
  const approaches = resolveChainedGateApproachXs(n, scrollSpeedPxPerSec);
  return gates.map((g, i) => {
    if (typeof g.world_x === "number" && Number.isFinite(g.world_x)) {
      return Math.min(maxX, Math.max(approaches[i]! + 80, g.world_x));
    }
    return Math.min(maxX, approaches[i]! + Math.round(scrollSpeedPxPerSec * 2));
  });
}

/** Chain gate trigger positions: short run-in, then quiz (countdown + sprint on UI). */
export function resolveChainedGateApproachXs(
  gateCount: number,
  scrollSpeedPxPerSec: number,
): number[] {
  if (gateCount === 0) return [];
  const firstRunPx = Math.round(scrollSpeedPxPerSec * EXPLORE_FIRST_GATE_RUN_IN_SEC);
  const betweenPx = Math.round(scrollSpeedPxPerSec * EXPLORE_GATE_BETWEEN_SEC);
  const approaches: number[] = [EXPLORE_PLAYER_START_X + firstRunPx];
  for (let i = 1; i < gateCount; i++) {
    approaches.push(approaches[i - 1]! + betweenPx);
  }
  return approaches;
}

export function buildExploreRunConfig(payload: ExplorePayload): ExploreRunConfig {
  const worldLength = payload.world_length ?? 3200;
  const scrollSpeedPxPerSec = payload.scroll_speed_px_per_sec ?? 140;
  const worldXs = resolveGateWorldPositions(
    payload.gates,
    worldLength,
    scrollSpeedPxPerSec,
  );
  const approachXs = resolveChainedGateApproachXs(payload.gates.length, scrollSpeedPxPerSec);
  const gates: ResolvedExploreGate[] = payload.gates.map((g, gateIndex) => ({
    ...g,
    gateIndex,
    world_x: worldXs[gateIndex]!,
    approach_world_x: approachXs[gateIndex]!,
  }));
  const hazards: ExploreHazard[] = gates.map((g, gateIndex) => ({
    gateIndex,
    x: g.world_x + EXPLORE_OBSTACLE_OFFSET_X,
    y: EXPLORE_GROUND_Y - 34,
    w: 30,
    h: 34,
    kind: gateIndex % 2 === 0 ? "spike" : "lava",
    cleared: false,
  }));
  return { worldLength, scrollSpeedPxPerSec, gates, hazards };
}

export function createExploreRunState(): ExploreRunState {
  return {
    mode: "running",
    playerX: EXPLORE_PLAYER_START_X,
    playerY: EXPLORE_GROUND_Y - EXPLORE_PLAYER_H,
    activeGateIndex: 0,
    gatesCleared: 0,
    gateOutcome: null,
    resolveStartedAtMs: null,
    hitFlashUntilMs: null,
    scrollSpeedMul: 1,
  };
}

export function playerRect(px: number, py: number): Rect {
  return { x: px, y: py, w: EXPLORE_PLAYER_W, h: EXPLORE_PLAYER_H };
}

export function hazardRect(h: ExploreHazard): Rect {
  return { x: h.x, y: h.y, w: h.w, h: h.h };
}

/** Gate triggers when player reaches obstacle approach line. */
export function shouldTriggerGate(
  playerX: number,
  gate: ResolvedExploreGate,
  gatesCleared: number,
  gateIndex: number,
): boolean {
  return gatesCleared === gateIndex && playerX >= gate.approach_world_x;
}

/** True when the player has run into the active gate hazard. */
export function playerHitsHazard(playerX: number, hazard: ExploreHazard): boolean {
  if (hazard.cleared) return false;
  const playerFront = playerX + EXPLORE_PLAYER_W;
  return playerFront >= hazard.x - 4;
}

export function allGatesCleared(gatesCleared: number, gateCount: number): boolean {
  return gatesCleared >= gateCount;
}

export type ExploreTickInput = {
  dtSec: number;
  nowMs: number;
  config: ExploreRunConfig;
  state: ExploreRunState;
};

export type ExploreTickResult = {
  state: ExploreRunState;
  gateTriggered?: number;
  /** Player reached hazard during gate quiz without answering in time. */
  gateAutoHit?: boolean;
  segmentComplete?: boolean;
};

export function tickExploreRun(input: ExploreTickInput): ExploreTickResult {
  const { dtSec, nowMs, config, state } = input;
  let next: ExploreRunState = { ...state };

  if (next.mode === "gateResolve") {
    if (next.resolveStartedAtMs == null) {
      next.resolveStartedAtMs = nowMs;
    }
    const started = next.resolveStartedAtMs;
    if (nowMs - started >= EXPLORE_GATE_RESOLVE_MS) {
      const outcome = next.gateOutcome;
      const hazard = config.hazards[next.activeGateIndex];
      if (outcome === "dodge" && hazard) {
        hazard.cleared = true;
      }
      if (outcome === "hit") {
        next.hitFlashUntilMs = nowMs + 400;
        next.scrollSpeedMul = 0.55;
      } else {
        next.scrollSpeedMul = 1;
      }
      next.gatesCleared += 1;
      next.gateOutcome = null;
      next.resolveStartedAtMs = null;
      if (allGatesCleared(next.gatesCleared, config.gates.length)) {
        next.mode = "encounter";
        return { state: next };
      }
      next.mode = "running";
      next.activeGateIndex = next.gatesCleared;
    }
    return { state: next };
  }

  /** Loop 1: quiz only — no approach to hazard; outcome comes from spelling/timer. */
  if (next.mode === "gateQuiz") {
    return { state: next };
  }

  if (next.mode !== "running") {
    return { state: next };
  }

  if (next.hitFlashUntilMs != null && nowMs > next.hitFlashUntilMs) {
    next.hitFlashUntilMs = null;
    next.scrollSpeedMul = 1;
  }

  const speed =
    config.scrollSpeedPxPerSec * next.scrollSpeedMul * Math.max(0, dtSec);
  next.playerX = Math.min(config.worldLength - 120, next.playerX + speed);

  for (let i = 0; i < config.gates.length; i++) {
    const gate = config.gates[i]!;
    if (shouldTriggerGate(next.playerX, gate, next.gatesCleared, i)) {
      next.mode = "gateQuiz";
      next.activeGateIndex = i;
      return { state: next, gateTriggered: i };
    }
  }

  if (next.playerX >= config.worldLength - 200 && allGatesCleared(next.gatesCleared, config.gates.length)) {
    next.mode = "encounter";
    return { state: next };
  }

  return { state: next };
}

export function beginGateResolve(
  state: ExploreRunState,
  outcome: ExploreGateOutcome,
  nowMs: number,
): ExploreRunState {
  return {
    ...state,
    mode: "gateResolve",
    gateOutcome: outcome,
    resolveStartedAtMs: nowMs,
  };
}

export function completeExploreSegment(state: ExploreRunState): ExploreRunState {
  return { ...state, mode: "complete" };
}
