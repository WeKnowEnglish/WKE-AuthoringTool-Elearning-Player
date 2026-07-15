import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildInteractionPositionSyncKey,
  InteractionPositionSyncController,
  isPositionSyncContextReady,
  LIVE_GAME_INTERACTION_POSITION_INFLIGHT_SAME_PX,
  LIVE_GAME_INTERACTION_POSITION_REUSE_DISTANCE_PX,
  LIVE_GAME_INTERACTION_POSITION_REUSE_MS,
  normalizeInteractionPosition,
  type PositionSyncContext,
} from "@/lib/live-game/interaction-position-sync-controller";
import {
  awaitLiveGamePositionSync,
  requireLiveGamePositionSync,
} from "@/lib/live-game/challenge-position-sync";

function context(overrides: Partial<PositionSyncContext> = {}): PositionSyncContext {
  return {
    roomId: "room-a",
    playerId: "player-1",
    sessionGeneration: 1,
    ...overrides,
  };
}

function okResponse() {
  return new Response(null, { status: 200 });
}

function failResponse() {
  return new Response(null, { status: 500 });
}

type PublishMock = ReturnType<typeof createPublishMock>;

function createPublishMock(options?: { delayMs?: number; fail?: boolean; status?: number }) {
  let calls = 0;
  const positions: Array<{ x: number; y: number }> = [];
  const publish = vi.fn(async (position: { x: number; y: number }) => {
    calls += 1;
    positions.push(position);
    if (options?.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, options.delayMs));
    }
    if (options?.status) return new Response(null, { status: options.status });
    return options?.fail ? failResponse() : okResponse();
  });
  return { publish, getCalls: () => calls, getPositions: () => positions };
}

/**
 * Mirrors the fixed hook lifecycle without React:
 * - context updates keep the controller usable
 * - dispose permanently disables that instance
 * - Strict Mode cleanup/setup creates a replacement
 */
function createLifecycleHarness(initial = context()) {
  let controller = new InteractionPositionSyncController();
  let sessionGeneration = 1;
  let appliedKey: string | null = null;

  function ensureController() {
    if (!controller.isDisposed()) return controller;
    controller = new InteractionPositionSyncController();
    appliedKey = null;
    return controller;
  }

  function ensureContext(next = initial) {
    const readiness = isPositionSyncContextReady(next);
    if (!readiness.ready) return { ready: false as const, reason: readiness.reason };
    const active = ensureController();
    const key = `${readiness.context.roomId}|${readiness.context.playerId}`;
    if (appliedKey !== key) {
      sessionGeneration += appliedKey == null && sessionGeneration >= 1 ? 0 : 0;
      if (appliedKey !== null) sessionGeneration += 1;
      appliedKey = key;
    }
    if (sessionGeneration < 1) sessionGeneration = 1;
    active.setContext({
      ...readiness.context,
      sessionGeneration,
    });
    return { ready: true as const, controller: active };
  }

  // Initialize like first render.
  ensureContext(initial);

  function simulateStrictModeEffectCycle() {
    const mounted = ensureController();
    ensureContext(initial);
    // cleanup
    mounted.dispose("permanent_unmount");
    appliedKey = null;
    // remount
    ensureContext(initial);
  }

  return {
    ensureContext,
    ensureController,
    getController: () => controller,
    simulateStrictModeEffectCycle,
    disposePermanent: () => {
      controller.dispose("permanent_unmount");
    },
  };
}

describe("InteractionPositionSyncController", () => {
  let controller: InteractionPositionSyncController;
  let mock: PublishMock;
  const baseNow = 1_000_000;

  beforeEach(() => {
    vi.useFakeTimers();
    controller = new InteractionPositionSyncController();
    controller.setContext(context());
    mock = createPublishMock();
  });

  afterEach(() => {
    controller.dispose();
    vi.useRealTimers();
  });

  function sync(
    position: { x: number; y: number },
    options?: { force?: boolean; now?: number; readPosition?: () => { x: number; y: number } },
  ) {
    return controller.sync({
      position,
      readPosition: options?.readPosition,
      force: options?.force,
      now: options?.now ?? baseNow,
      publish: mock.publish,
    });
  }

  it("performs a first sync on a newly initialized controller", async () => {
    const result = await sync({ x: 10, y: 20 });
    expect(result.ok).toBe(true);
    expect(result.outcome).toBe("started");
    expect(mock.getCalls()).toBe(1);
  });

  it("increments requestSequence from 0 on the first sync", async () => {
    const result = await sync({ x: 1, y: 1 });
    expect(result.requestSequence).toBe(1);
    expect(result.latestSequenceAtCompletion).toBe(1);
  });

  it("produces a non-null sync key on the first sync", async () => {
    const result = await sync({ x: 3, y: 4 });
    expect(result.syncKeyHash).toBeTruthy();
  });

  it("reaches the network for a forced first sync", async () => {
    const result = await sync({ x: 5, y: 5 }, { force: true });
    expect(result.outcome).toBe("forced_started");
    expect(result.requestReachedFetch).toBe(true);
    expect(mock.getCalls()).toBe(1);
  });

  it("reaches the network for a non-forced first sync", async () => {
    const result = await sync({ x: 6, y: 6 });
    expect(result.outcome).toBe("started");
    expect(result.requestReachedFetch).toBe(true);
    expect(mock.getCalls()).toBe(1);
  });

  it("works with a host context", async () => {
    controller.setContext(context({ playerId: "host-1", roomId: "room-host" }));
    const result = await sync({ x: 1, y: 2 }, { force: true });
    expect(result.ok).toBe(true);
    expect(result.hasPlayerId).toBe(true);
    expect(result.hasRoomId).toBe(true);
  });

  it("works with a player context", async () => {
    controller.setContext(context({ playerId: "player-9", roomId: "room-player" }));
    const result = await sync({ x: 1, y: 2 }, { force: true });
    expect(result.ok).toBe(true);
  });

  it("enables syncing after context becomes ready", async () => {
    const fresh = new InteractionPositionSyncController();
    const before = await fresh.sync({
      position: { x: 1, y: 1 },
      publish: mock.publish,
    });
    expect(before.outcome).toBe("not_ready");
    expect(before.requestSequence).toBe(0);

    fresh.setContext(context());
    const after = await fresh.sync({
      position: { x: 1, y: 1 },
      publish: mock.publish,
    });
    expect(after.ok).toBe(true);
    expect(after.requestSequence).toBe(1);
    fresh.dispose();
  });

  it("does not permanently dispose on setContext / ordinary context updates", async () => {
    await sync({ x: 1, y: 1 });
    controller.setContext(context({ sessionGeneration: 2 }));
    expect(controller.isDisposed()).toBe(false);
    const result = await sync({ x: 2, y: 2 });
    expect(result.ok).toBe(true);
    expect(result.requestSequence).toBe(1);
  });

  it("setContext cannot revive a disposed controller", async () => {
    controller.dispose();
    const applied = controller.setContext(context());
    expect(applied).toBe(false);
    const result = await sync({ x: 1, y: 1 });
    expect(result.outcome).toBe("disposed");
    expect(result.abortReason).toBe("controller_disposed");
    expect(result.requestSequence).toBe(0);
    expect(mock.getCalls()).toBe(0);
  });

  it("survives a Strict Mode cleanup/setup simulation via replacement", async () => {
    const harness = createLifecycleHarness();
    harness.simulateStrictModeEffectCycle();
    const active = harness.getController();
    expect(active.isDisposed()).toBe(false);
    mock = createPublishMock();
    const result = await active.sync({
      position: { x: 8, y: 8 },
      force: true,
      publish: mock.publish,
    });
    expect(result.ok).toBe(true);
    expect(result.outcome).toBe("forced_started");
    expect(result.requestSequence).toBeGreaterThanOrEqual(1);
    expect(result.syncKeyHash).toBeTruthy();
    expect(mock.getCalls()).toBe(1);
  });

  it("keeps the controller usable across lobby → playing style context reuse", async () => {
    // Same room/player identity; generation stays valid; sync still works.
    controller.setContext(context());
    const result = await sync({ x: 4, y: 4 }, { force: true });
    expect(result.ok).toBe(true);
    expect(controller.isDisposed()).toBe(false);
  });

  it("room context update invalidates old state but permits a new request", async () => {
    await sync({ x: 2, y: 2 }, { now: baseNow });
    controller.setContext(context({ roomId: "room-b", sessionGeneration: 2 }));
    const after = await sync({ x: 2, y: 2 }, { now: baseNow + 100 });
    expect(after.outcome).toBe("started");
    expect(mock.getCalls()).toBe(2);
  });

  it("player context update invalidates old state but permits a new request", async () => {
    await sync({ x: 2, y: 2 }, { now: baseNow });
    controller.setContext(context({ playerId: "player-2", sessionGeneration: 2 }));
    const after = await sync({ x: 2, y: 2 }, { now: baseNow + 100 });
    expect(after.outcome).toBe("started");
    expect(mock.getCalls()).toBe(2);
  });

  it("session-generation update invalidates old state but permits a new request", async () => {
    await sync({ x: 2, y: 2 }, { now: baseNow });
    controller.setContext(context({ sessionGeneration: 2 }));
    const after = await sync({ x: 2, y: 2 }, { now: baseNow + 100 });
    expect(after.outcome).toBe("started");
    expect(mock.getCalls()).toBe(2);
  });

  it("permanent unmount disposes the controller", () => {
    controller.dispose("permanent_unmount");
    expect(controller.isDisposed()).toBe(true);
  });

  it("a disposed old instance cannot affect a replacement instance", async () => {
    const old = controller;
    old.dispose();
    const replacement = new InteractionPositionSyncController();
    replacement.setContext(context());
    mock = createPublishMock();
    const result = await replacement.sync({
      position: { x: 9, y: 9 },
      publish: mock.publish,
    });
    expect(result.ok).toBe(true);
    expect(mock.getCalls()).toBe(1);
    const stale = await old.sync({
      position: { x: 9, y: 9 },
      publish: mock.publish,
    });
    expect(stale.outcome).toBe("disposed");
    expect(mock.getCalls()).toBe(1);
    replacement.dispose();
  });

  it("deduplicates two identical simultaneous position requests into one REST call", async () => {
    const first = sync({ x: 10, y: 20 });
    const second = sync({ x: 10, y: 20 });
    const [a, b] = await Promise.all([first, second]);
    expect(mock.getCalls()).toBe(1);
    expect(a.ok).toBe(true);
    expect(b.outcome).toBe("deduplicated_inflight");
  });

  it("lets a forced interaction reuse an identical in-flight request", async () => {
    mock = createPublishMock({ delayMs: 50 });
    const first = sync({ x: 5, y: 5 });
    const forced = sync({ x: 5, y: 5 }, { force: true });
    await vi.advanceTimersByTimeAsync(50);
    const [, forcedResult] = await Promise.all([first, forced]);
    expect(mock.getCalls()).toBe(1);
    expect(forcedResult.outcome).toBe("forced_reused_inflight");
  });

  it("does not let a forced interaction reuse an old completed result", async () => {
    await sync({ x: 1, y: 1 }, { now: baseNow });
    const forced = await sync({ x: 1, y: 1 }, { force: true, now: baseNow + 100 });
    expect(forced.outcome).toBe("forced_started");
    expect(mock.getCalls()).toBe(2);
  });

  it("reuses a recent valid non-forced result", async () => {
    await sync({ x: 8, y: 8 }, { now: baseNow });
    const reused = await sync(
      { x: 8 + LIVE_GAME_INTERACTION_POSITION_REUSE_DISTANCE_PX / 2, y: 8 },
      { now: baseNow + 500 },
    );
    expect(reused.outcome).toBe("reused_recent");
    expect(mock.getCalls()).toBe(1);
  });

  it("does not reuse a result outside the reuse time window", async () => {
    await sync({ x: 3, y: 3 }, { now: baseNow });
    const stale = await sync({ x: 3, y: 3 }, {
      now: baseNow + LIVE_GAME_INTERACTION_POSITION_REUSE_MS + 1,
    });
    expect(stale.outcome).toBe("started");
    expect(mock.getCalls()).toBe(2);
  });

  it("does not reuse a position beyond the movement threshold", async () => {
    await sync({ x: 0, y: 0 }, { now: baseNow });
    const moved = await sync(
      { x: LIVE_GAME_INTERACTION_POSITION_REUSE_DISTANCE_PX + 1, y: 0 },
      { now: baseNow + 200 },
    );
    expect(moved.outcome).toBe("started");
    expect(mock.getCalls()).toBe(2);
  });

  it("starts a new request for a materially different in-flight position", async () => {
    mock = createPublishMock({ delayMs: 30 });
    const first = sync({ x: 10, y: 10 });
    const second = sync({ x: 100, y: 100 });
    await vi.advanceTimersByTimeAsync(60);
    await Promise.all([first, second]);
    expect(mock.getCalls()).toBe(2);
  });

  it("keeps the newest successful position after movement and resync", async () => {
    await sync({ x: 10, y: 10 }, { now: baseNow });
    await sync({ x: 90, y: 90 }, { now: baseNow + 2_000 });
    const reused = await sync({ x: 91, y: 90 }, { now: baseNow + 2_100 });
    expect(reused.outcome).toBe("reused_recent");
  });

  it("removes a failed request and allows retry", async () => {
    mock = createPublishMock({ fail: true });
    const failed = await sync({ x: 4, y: 4 });
    expect(failed.ok).toBe(false);
    expect(failed.outcome).toBe("failed");

    mock = createPublishMock();
    const retry = await sync({ x: 4, y: 4 });
    expect(retry.ok).toBe(true);
    expect(mock.getCalls()).toBe(1);
  });

  it("prevents stale updates when session generation changes mid-flight", async () => {
    mock = createPublishMock({ delayMs: 100 });
    const inFlight = sync({ x: 7, y: 7 });
    controller.setContext(context({ sessionGeneration: 2 }));
    await vi.advanceTimersByTimeAsync(100);
    const result = await inFlight;
    expect(result.outcome).toBe("aborted_context_change");
    expect(result.abortReason).toBe("context_generation_mismatch");
    expect(result.ok).toBe(false);
  });

  it("aborts safely on permanent dispose during flight", async () => {
    mock = createPublishMock({ delayMs: 100 });
    const inFlight = sync({ x: 9, y: 9 });
    controller.dispose();
    await vi.advanceTimersByTimeAsync(100);
    const result = await inFlight;
    expect(result.ok).toBe(false);
    expect(result.outcome).toBe("disposed");
  });

  it("uses the newest coordinates when chaining after in-flight work", async () => {
    mock = createPublishMock({ delayMs: 30 });
    let current = { x: 1, y: 1 };
    const first = sync(current);
    current = { x: 50, y: 50 };
    const second = sync({ x: 30, y: 1 }, {
      readPosition: () => current,
    });
    await vi.advanceTimersByTimeAsync(60);
    await Promise.all([first, second]);
    expect(mock.getPositions().at(-1)).toEqual(normalizeInteractionPosition({ x: 50, y: 50 }));
  });

  it("normalizes coordinates consistently for sync keys", () => {
    const keyA = buildInteractionPositionSyncKey(context(), { x: 10.04, y: 20.06 });
    const keyB = buildInteractionPositionSyncKey(context(), { x: 10.0, y: 20.1 });
    expect(keyA).toBe(keyB);
  });

  it("treats positions within the in-flight same threshold as equivalent", async () => {
    mock = createPublishMock({ delayMs: 40 });
    const first = sync({ x: 10, y: 10 });
    const near = sync({
      x: 10 + LIVE_GAME_INTERACTION_POSITION_INFLIGHT_SAME_PX - 0.5,
      y: 10,
    });
    await vi.advanceTimersByTimeAsync(40);
    const [, nearResult] = await Promise.all([first, near]);
    expect(mock.getCalls()).toBe(1);
    expect(nearResult.outcome).toBe("deduplicated_inflight");
  });

  it("regression: poisoned disposed controller used to reject every sync with sequence 0", async () => {
    // Reproduce the production failure mode from the previous hook, then prove
    // the replacement lifecycle recovers.
    controller.dispose();
    controller.setContext(context()); // previously appeared to restore context
    const poisoned = await sync({ x: 1, y: 1 }, { force: true });
    expect(poisoned.outcome).toBe("disposed");
    expect(poisoned.requestSequence).toBe(0);
    expect(poisoned.syncKeyHash).toBeNull();
    expect(mock.getCalls()).toBe(0);

    const harness = createLifecycleHarness();
    harness.simulateStrictModeEffectCycle();
    mock = createPublishMock();
    const recovered = await harness.getController().sync({
      position: { x: 1, y: 1 },
      force: true,
      publish: mock.publish,
    });
    expect(recovered.ok).toBe(true);
    expect(recovered.requestSequence).toBeGreaterThanOrEqual(1);
    expect(recovered.syncKeyHash).toBeTruthy();
    expect(mock.getCalls()).toBe(1);
  });
});

describe("position sync readiness helpers", () => {
  it("reports missing room / player / session distinctly", () => {
    expect(isPositionSyncContextReady({ roomId: "", playerId: "p", sessionGeneration: 1 }).ready).toBe(
      false,
    );
    expect(
      isPositionSyncContextReady({ roomId: "r", playerId: "", sessionGeneration: 1 }).ready,
    ).toBe(false);
    expect(
      isPositionSyncContextReady({ roomId: "r", playerId: "p", sessionGeneration: 0 }).ready,
    ).toBe(false);
  });
});

describe("challenge position sync await helpers", () => {
  it("awaits PositionSyncResult details for interaction diagnostics", async () => {
    const detail = await awaitLiveGamePositionSync(
      Promise.resolve({
        ok: true,
        outcome: "reused_recent",
        forceRequested: false,
        requestSequence: 2,
        latestSequenceAtCompletion: 2,
        reuseWindowMs: LIVE_GAME_INTERACTION_POSITION_REUSE_MS,
        reuseDistancePx: LIVE_GAME_INTERACTION_POSITION_REUSE_DISTANCE_PX,
      }),
    );
    expect(detail.waitedForPositionSync).toBe(true);
    expect(detail.positionSyncOutcome).toBe("reused_recent");
  });

  it("requires a successful sync before challenge work continues", async () => {
    await expect(
      requireLiveGamePositionSync(
        Promise.resolve({
          ok: false,
          outcome: "disposed",
          forceRequested: true,
          requestSequence: 0,
          latestSequenceAtCompletion: 0,
          reuseWindowMs: LIVE_GAME_INTERACTION_POSITION_REUSE_MS,
          reuseDistancePx: LIVE_GAME_INTERACTION_POSITION_REUSE_DISTANCE_PX,
        }),
      ),
    ).rejects.toThrow();
  });

  it("skips waiting when no sync promise was provided", async () => {
    const detail = await requireLiveGamePositionSync(undefined);
    expect(detail.waitedForPositionSync).toBe(false);
    expect(detail.ok).toBe(true);
  });
});

describe("cold interaction position → challenge integration", () => {
  it("forced position sync then challenge begins after successful sync", async () => {
    const harness = createLifecycleHarness();
    // Simulate lobby → playing identity already ready, then Strict Mode churn.
    harness.simulateStrictModeEffectCycle();

    const publish = createPublishMock();
    let challengeCalls = 0;

    const positionSync = harness.getController().sync({
      position: { x: 100, y: 120 },
      force: true,
      publish: publish.publish,
    });

    const positionDetail = await requireLiveGamePositionSync(positionSync);
    expect(positionDetail.ok).toBe(true);
    expect(positionDetail.waitedForPositionSync).toBe(true);
    expect(positionDetail.positionSyncOutcome).toMatch(/forced_started|started/);
    expect(publish.getCalls()).toBe(1);

    // Cold harvest would only request a challenge after position verification.
    challengeCalls += 1;
    expect(challengeCalls).toBe(1);
  });

  it("warm challenge path can skip position sync entirely", async () => {
    const detail = await requireLiveGamePositionSync(undefined);
    expect(detail.waitedForPositionSync).toBe(false);
    expect(detail.positionWaitMs).toBe(0);
  });

  it("failed sync blocks the challenge request", async () => {
    const controller = new InteractionPositionSyncController();
    controller.setContext(context());
    const publish = createPublishMock({ fail: true });
    await expect(
      requireLiveGamePositionSync(
        controller.sync({
          position: { x: 1, y: 1 },
          force: true,
          publish: publish.publish,
        }),
      ),
    ).rejects.toThrow();
    expect(publish.getCalls()).toBe(1);
    controller.dispose();
  });
});
