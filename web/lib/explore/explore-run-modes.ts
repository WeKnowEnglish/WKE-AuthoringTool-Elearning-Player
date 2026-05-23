import type { ExploreRunMode, ExploreRunState } from "@/lib/explore/explore-run-engine";

const MODE_RANK: Record<ExploreRunMode, number> = {
  running: 0,
  gateQuiz: 1,
  gateResolve: 2,
  encounter: 3,
  complete: 4,
};

/**
 * Merge engine mode into UI mode without stale RAF ticks downgrading
 * (e.g. gateResolve → gateQuiz). Allows engine to finish resolve → running/encounter.
 */
export function resolveExploreMode(
  current: ExploreRunMode,
  engineMode: ExploreRunMode,
): ExploreRunMode {
  if (current === engineMode) return current;
  if (
    current === "gateResolve" &&
    (engineMode === "running" || engineMode === "encounter")
  ) {
    return engineMode;
  }
  if (MODE_RANK[engineMode] >= MODE_RANK[current]) {
    return engineMode;
  }
  return current;
}

/**
 * Merge a RAF/engine snapshot into React run state without stale gateQuiz ticks
 * wiping gateResolve timer fields (which would freeze the obstacle clip).
 */
export function mergeExploreRunState(
  prev: ExploreRunState,
  next: ExploreRunState,
): ExploreRunState {
  const mode = resolveExploreMode(prev.mode, next.mode);

  if (
    prev.mode === "gateResolve" &&
    (mode === "running" || mode === "encounter") &&
    next.gatesCleared > prev.gatesCleared
  ) {
    return { ...next, mode };
  }

  if (
    prev.mode === "gateResolve" &&
    next.mode === "gateQuiz" &&
    next.gatesCleared <= prev.gatesCleared
  ) {
    return prev;
  }

  if (mode === "gateResolve") {
    return {
      ...next,
      mode: "gateResolve",
      gateOutcome: next.gateOutcome ?? prev.gateOutcome,
      resolveStartedAtMs: next.resolveStartedAtMs ?? prev.resolveStartedAtMs,
    };
  }

  return { ...next, mode };
}
