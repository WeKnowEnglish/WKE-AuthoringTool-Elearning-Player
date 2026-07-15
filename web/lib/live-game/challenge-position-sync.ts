import type {
  PositionSyncOutcome,
  PositionSyncResult,
} from "@/lib/live-game/interaction-position-sync-controller";
import type { ChallengePrefetchFailReason } from "@/lib/live-game/challenge-prefetch-controller";

export const LIVE_GAME_POSITION_SYNC_ERROR =
  "Could not verify your position. Check your connection and try again.";

const USABLE_POSITION_SYNC_OUTCOMES = new Set<PositionSyncOutcome>([
  "started",
  "reused_recent",
  "deduplicated_inflight",
  "forced_started",
  "forced_reused_inflight",
]);

/**
 * Prefetch and other non-authoritative waits must use this helper — never object
 * truthiness and never a bare boolean comparison against a structured result.
 */
export function isUsableLiveGamePositionSyncResult(
  result: boolean | PositionSyncResult | null | undefined,
): boolean {
  if (result === true) return true;
  if (result === false || result == null) return false;
  if (typeof result !== "object") return false;
  return result.ok === true && USABLE_POSITION_SYNC_OUTCOMES.has(result.outcome);
}

export function prefetchFailReasonFromPositionSync(
  result: boolean | PositionSyncResult | null | undefined,
): ChallengePrefetchFailReason | null {
  if (isUsableLiveGamePositionSyncResult(result)) return null;
  if (result === false || result == null) return "position_result_unusable";
  if (typeof result !== "object") return "position_result_unusable";
  switch (result.outcome) {
    case "not_ready":
      return "position_not_ready";
    case "disposed":
      return "position_disposed";
    case "aborted_context_change":
      return "position_context_changed";
    case "failed":
      return "position_failed";
    default:
      return "position_result_unusable";
  }
}

export function positionSyncOutcomeForDiagnostic(
  result: boolean | PositionSyncResult | null | undefined,
): PositionSyncOutcome | null {
  if (result && typeof result === "object" && "outcome" in result) {
    return result.outcome;
  }
  return null;
}

export type PositionSyncAwaitDetail = {  ok: boolean;
  positionWaitMs: number;
  waitedForPositionSync: boolean;
  positionSyncOutcome?: PositionSyncOutcome;
  forceRequested?: boolean;
  requestSequence?: number;
  positionAgeMs?: number;
  movementDeltaPx?: number;
  inFlightAgeMs?: number;
};

function isPositionSyncResult(value: unknown): value is PositionSyncResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    "outcome" in value
  );
}

export async function awaitLiveGamePositionSync(
  positionSync: Promise<boolean | PositionSyncResult> | null | undefined,
): Promise<PositionSyncAwaitDetail> {
  if (!positionSync) {
    return {
      ok: true,
      positionWaitMs: 0,
      waitedForPositionSync: false,
    };
  }

  const startedAt = typeof performance === "undefined" ? Date.now() : performance.now();
  const result = await positionSync;
  const positionWaitMs = Math.round(
    (typeof performance === "undefined" ? Date.now() : performance.now()) - startedAt,
  );

  if (isPositionSyncResult(result)) {
    return {
      ok: result.ok,
      positionWaitMs,
      waitedForPositionSync: true,
      positionSyncOutcome: result.outcome,
      forceRequested: result.forceRequested,
      requestSequence: result.requestSequence,
      positionAgeMs: result.positionAgeMs,
      movementDeltaPx: result.movementDeltaPx,
      inFlightAgeMs: result.inFlightAgeMs,
    };
  }

  return {
    ok: result === true,
    positionWaitMs,
    waitedForPositionSync: true,
  };
}

export function positionSyncInteractionFields(detail: PositionSyncAwaitDetail) {
  return {
    waitedForPositionSync: detail.waitedForPositionSync,
    positionSyncOutcome: detail.positionSyncOutcome ?? null,
    positionWaitMs: detail.positionWaitMs,
  };
}

export async function requireLiveGamePositionSync(
  positionSync: Promise<boolean | PositionSyncResult> | null | undefined,
): Promise<PositionSyncAwaitDetail> {
  const detail = await awaitLiveGamePositionSync(positionSync);
  if (!detail.ok) {
    throw new Error(LIVE_GAME_POSITION_SYNC_ERROR);
  }
  return detail;
}
