import { describe, expect, it } from "vitest";
import {
  awaitLiveGamePositionSync,
  isUsableLiveGamePositionSyncResult,
  LIVE_GAME_POSITION_SYNC_ERROR,
  positionSyncInteractionFields,
  prefetchFailReasonFromPositionSync,
  requireLiveGamePositionSync,
} from "@/lib/live-game/challenge-position-sync";
import {
  LIVE_GAME_INTERACTION_POSITION_REUSE_DISTANCE_PX,
  LIVE_GAME_INTERACTION_POSITION_REUSE_MS,
  type PositionSyncResult,
} from "@/lib/live-game/interaction-position-sync-controller";

function syncResult(
  outcome: PositionSyncResult["outcome"],
  ok = true,
): PositionSyncResult {
  return {
    ok,
    outcome,
    forceRequested: false,
    requestSequence: ok ? 1 : 0,
    latestSequenceAtCompletion: ok ? 1 : 0,
    reuseWindowMs: LIVE_GAME_INTERACTION_POSITION_REUSE_MS,
    reuseDistancePx: LIVE_GAME_INTERACTION_POSITION_REUSE_DISTANCE_PX,
  };
}

describe("live-game challenge position sync", () => {
  it("allows challenge work after a successful position sync", async () => {
    const detail = await requireLiveGamePositionSync(Promise.resolve(true));
    expect(detail.ok).toBe(true);
    expect(detail.waitedForPositionSync).toBe(true);
  });

  it("blocks challenge work when the position could not be verified", async () => {
    await expect(requireLiveGamePositionSync(Promise.resolve(false))).rejects.toThrow(
      LIVE_GAME_POSITION_SYNC_ERROR,
    );
  });

  it("keeps existing callers compatible when no sync is needed", async () => {
    const detail = await requireLiveGamePositionSync(undefined);
    expect(detail.ok).toBe(true);
    expect(detail.waitedForPositionSync).toBe(false);
  });

  it("maps position sync detail fields for interaction diagnostics", () => {
    expect(
      positionSyncInteractionFields({
        ok: true,
        waitedForPositionSync: true,
        positionWaitMs: 42,
        positionSyncOutcome: "deduplicated_inflight",
      }),
    ).toEqual({
      waitedForPositionSync: true,
      positionSyncOutcome: "deduplicated_inflight",
      positionWaitMs: 42,
    });
  });

  it("reads structured PositionSyncResult payloads", async () => {
    const detail = await awaitLiveGamePositionSync(
      Promise.resolve({
        ok: true,
        outcome: "started",
        forceRequested: true,
        requestSequence: 3,
        latestSequenceAtCompletion: 3,
        reuseWindowMs: LIVE_GAME_INTERACTION_POSITION_REUSE_MS,
        reuseDistancePx: LIVE_GAME_INTERACTION_POSITION_REUSE_DISTANCE_PX,
      }),
    );
    expect(detail.positionSyncOutcome).toBe("started");
    expect(detail.forceRequested).toBe(true);
    expect(detail.requestSequence).toBe(3);
  });
});

describe("isUsableLiveGamePositionSyncResult", () => {
  it("treats started as usable for prefetch continuation", () => {
    expect(isUsableLiveGamePositionSyncResult(syncResult("started"))).toBe(true);
  });

  it("treats reused_recent as usable", () => {
    expect(isUsableLiveGamePositionSyncResult(syncResult("reused_recent"))).toBe(true);
  });

  it("treats deduplicated_inflight as usable", () => {
    expect(isUsableLiveGamePositionSyncResult(syncResult("deduplicated_inflight"))).toBe(true);
  });

  it("treats forced outcomes as usable", () => {
    expect(isUsableLiveGamePositionSyncResult(syncResult("forced_started"))).toBe(true);
    expect(isUsableLiveGamePositionSyncResult(syncResult("forced_reused_inflight"))).toBe(true);
  });

  it("rejects failed / not_ready / disposed / context-change results", () => {
    expect(isUsableLiveGamePositionSyncResult(syncResult("failed", false))).toBe(false);
    expect(isUsableLiveGamePositionSyncResult(syncResult("not_ready", false))).toBe(false);
    expect(isUsableLiveGamePositionSyncResult(syncResult("disposed", false))).toBe(false);
    expect(isUsableLiveGamePositionSyncResult(syncResult("aborted_context_change", false))).toBe(
      false,
    );
  });

  it("does not treat a bare truthy object without ok as usable", () => {
    expect(isUsableLiveGamePositionSyncResult({} as PositionSyncResult)).toBe(false);
  });

  it("maps unusable outcomes to prefetch fail reasons", () => {
    expect(prefetchFailReasonFromPositionSync(syncResult("not_ready", false))).toBe(
      "position_not_ready",
    );
    expect(prefetchFailReasonFromPositionSync(syncResult("disposed", false))).toBe(
      "position_disposed",
    );
    expect(prefetchFailReasonFromPositionSync(syncResult("aborted_context_change", false))).toBe(
      "position_context_changed",
    );
    expect(prefetchFailReasonFromPositionSync(syncResult("failed", false))).toBe("position_failed");
    expect(prefetchFailReasonFromPositionSync(syncResult("started"))).toBeNull();
  });
});
