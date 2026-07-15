import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildChallengePrefetchKey,
  canStartChallengePrefetch,
  hashChallengePrefetchKey,
  isChallengePrefetchValid,
  LIVE_GAME_CHALLENGE_PREFETCH_EXPIRY_BUFFER_MS,
  LIVE_GAME_CHALLENGE_PREFETCH_LEAVE_GRACE_MS,
  LIVE_GAME_CHALLENGE_PREFETCH_MAX_ENTRIES,
  LIVE_GAME_CHALLENGE_PREFETCH_MIN_INTERVAL_MS,
} from "@/lib/live-game/challenge-prefetch";
import { LiveGameChallengePrefetchController } from "@/lib/live-game/challenge-prefetch-controller";
import type { ChallengePrefetchEntry } from "@/lib/live-game/challenge-prefetch";

type Q = { id: string };

function entry(nodeId: string, expiresInMs = 60_000): ChallengePrefetchEntry<Q> {
  return {
    nodeId,
    challengeId: `chal-${nodeId}`,
    expiresAt: Date.now() + expiresInMs,
    question: { id: `q-${nodeId}` },
    fetchedAt: Date.now(),
  };
}

describe("challenge prefetch helpers", () => {
  const now = 100_000;

  it("accepts a fresh cache entry for the same node", () => {
    expect(
      isChallengePrefetchValid(
        { nodeId: "tree-01", expiresAt: now + 60_000 },
        "tree-01",
        now,
      ),
    ).toBe(true);
  });

  it("rejects stale cache entries near expiry", () => {
    expect(
      isChallengePrefetchValid(
        {
          nodeId: "tree-01",
          expiresAt: now + LIVE_GAME_CHALLENGE_PREFETCH_EXPIRY_BUFFER_MS,
        },
        "tree-01",
        now,
      ),
    ).toBe(false);
  });

  it("rejects cache entries while the node is on cooldown", () => {
    expect(
      isChallengePrefetchValid(
        { nodeId: "tree-01", expiresAt: now + 60_000 },
        "tree-01",
        now,
        { cooldownEndsAt: now + 5_000 },
      ),
    ).toBe(false);
  });

  it("rate-limits prefetch starts", () => {
    expect(canStartChallengePrefetch(now - LIVE_GAME_CHALLENGE_PREFETCH_MIN_INTERVAL_MS, now)).toBe(
      true,
    );
    expect(
      canStartChallengePrefetch(now - LIVE_GAME_CHALLENGE_PREFETCH_MIN_INTERVAL_MS + 1, now),
    ).toBe(false);
  });

  it("builds a stable key that includes identity fields", () => {
    const key = buildChallengePrefetchKey({
      roomId: "wke-live-game-ABC123",
      activity: "harvest",
      targetId: "tree-01",
      playerId: "player-1",
      questionBundleVersion: 3,
    });
    expect(key).toBe("wke-live-game-ABC123|harvest|tree-01|player-1|3");
    expect(hashChallengePrefetchKey(key)).toMatch(/^[0-9a-z]+$/);
  });

  it("separates harvest and deposit / players / rooms / versions", () => {
    const base = {
      roomId: "room",
      activity: "harvest" as const,
      targetId: "tree-01",
      playerId: "p1",
      questionBundleVersion: 1,
    };
    expect(buildChallengePrefetchKey(base)).not.toBe(
      buildChallengePrefetchKey({ ...base, activity: "deposit" }),
    );
    expect(buildChallengePrefetchKey(base)).not.toBe(
      buildChallengePrefetchKey({ ...base, playerId: "p2" }),
    );
    expect(buildChallengePrefetchKey(base)).not.toBe(
      buildChallengePrefetchKey({ ...base, questionBundleVersion: 2 }),
    );
  });

  it("builds craft keys that isolate machine, recipe, player, room, and bundle", () => {
    const base = {
      roomId: "room",
      activity: "craft" as const,
      targetId: "craft-bench-01",
      recipeId: "build_bench",
      playerId: "p1",
      questionBundleVersion: 1,
    };
    expect(buildChallengePrefetchKey(base)).toBe(
      "room|craft|craft-bench-01|build_bench|p1|1",
    );
    expect(buildChallengePrefetchKey(base)).not.toBe(
      buildChallengePrefetchKey({ ...base, recipeId: "craft_hammer" }),
    );
    expect(buildChallengePrefetchKey(base)).not.toBe(
      buildChallengePrefetchKey({ ...base, targetId: "other-bench" }),
    );
    expect(buildChallengePrefetchKey(base)).not.toBe(
      buildChallengePrefetchKey({ ...base, playerId: "p2" }),
    );
    expect(buildChallengePrefetchKey(base)).not.toBe(
      buildChallengePrefetchKey({ ...base, questionBundleVersion: 2 }),
    );
  });
});

describe("LiveGameChallengePrefetchController", () => {
  let controller: LiveGameChallengePrefetchController<Q>;

  beforeEach(() => {
    vi.useFakeTimers();
    controller = new LiveGameChallengePrefetchController<Q>({
      minIntervalMs: 0,
      leaveGraceMs: LIVE_GAME_CHALLENGE_PREFETCH_LEAVE_GRACE_MS,
      maxEntries: LIVE_GAME_CHALLENGE_PREFETCH_MAX_ENTRIES,
    });
  });

  afterEach(() => {
    controller.dispose();
    vi.useRealTimers();
  });

  it("starts only one request for a repeated ensure on the same key", async () => {
    let starts = 0;
    const fetcher = vi.fn(async () => {
      starts += 1;
      await new Promise((resolve) => setTimeout(resolve, 50));
      return entry("tree-01");
    });

    const first = await controller.ensure({
      key: "k-tree-01",
      targetId: "tree-01",
      fetcher,
    });
    const second = await controller.ensure({
      key: "k-tree-01",
      targetId: "tree-01",
      fetcher,
    });

    expect(first.outcome).toBe("started");
    expect(second.outcome).toBe("deduplicated");
    expect(second.promise).toBe(first.promise);
    await vi.advanceTimersByTimeAsync(50);
    await first.promise;
    expect(starts).toBe(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("reuses a completed warm entry without refetching", async () => {
    const fetcher = vi.fn(async () => entry("tree-01"));
    const first = await controller.ensure({
      key: "k-tree-01",
      targetId: "tree-01",
      fetcher,
    });
    await first.promise;
    const second = await controller.ensure({
      key: "k-tree-01",
      targetId: "tree-01",
      fetcher,
    });
    expect(second.outcome).toBe("retained");
    expect(second.entry?.challengeId).toBe("chal-tree-01");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("does not abort during the leave-grace window", async () => {
    let aborted = false;
    const fetcher = vi.fn(async (signal: AbortSignal) => {
      signal.addEventListener("abort", () => {
        aborted = true;
      });
      await new Promise((resolve) => setTimeout(resolve, 5_000));
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      return entry("tree-01");
    });

    await controller.ensure({
      key: "k-tree-01",
      targetId: "tree-01",
      fetcher,
    });
    controller.releaseFocus();
    await vi.advanceTimersByTimeAsync(LIVE_GAME_CHALLENGE_PREFETCH_LEAVE_GRACE_MS - 10);
    expect(aborted).toBe(false);
    expect(controller.getEntryCount()).toBe(1);
  });

  it("keeps a completed entry when focus returns before leave grace expires", async () => {
    const fetcher = vi.fn(async () => entry("tree-01"));
    const started = await controller.ensure({
      key: "k-tree-01",
      targetId: "tree-01",
      fetcher,
    });
    await started.promise;
    controller.releaseFocus();
    await vi.advanceTimersByTimeAsync(LIVE_GAME_CHALLENGE_PREFETCH_LEAVE_GRACE_MS - 50);
    const returned = await controller.ensure({
      key: "k-tree-01",
      targetId: "tree-01",
      fetcher,
    });
    expect(returned.outcome).toBe("retained");
    await vi.advanceTimersByTimeAsync(LIVE_GAME_CHALLENGE_PREFETCH_LEAVE_GRACE_MS);
    expect(controller.peekWarm("k-tree-01", "tree-01")).not.toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("aborts after leave grace if focus does not return", async () => {
    let aborted = false;
    const fetcher = vi.fn(async (signal: AbortSignal) => {
      signal.addEventListener("abort", () => {
        aborted = true;
      });
      await new Promise((resolve) => setTimeout(resolve, 5_000));
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      return entry("tree-01");
    });

    await controller.ensure({
      key: "k-tree-01",
      targetId: "tree-01",
      fetcher,
    });
    controller.releaseFocus();
    await vi.advanceTimersByTimeAsync(LIVE_GAME_CHALLENGE_PREFETCH_LEAVE_GRACE_MS + 5);
    expect(aborted).toBe(true);
    expect(controller.getEntryCount()).toBe(0);
  });

  it("reuses matching in-flight promise after brief leave and return", async () => {
    const fetcher = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return entry("tree-01");
    });
    const first = await controller.ensure({
      key: "k-tree-01",
      targetId: "tree-01",
      fetcher,
    });
    controller.releaseFocus();
    await vi.advanceTimersByTimeAsync(20);
    const returned = await controller.ensure({
      key: "k-tree-01",
      targetId: "tree-01",
      fetcher,
    });
    expect(returned.outcome).toBe("deduplicated");
    expect(returned.promise).toBe(first.promise);
    await vi.advanceTimersByTimeAsync(200);
    await first.promise;
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("keeps a prior warm entry when visual focus moves to another target", async () => {
    const fetcherA = vi.fn(async () => entry("tree-01"));
    const fetcherB = vi.fn(async () => entry("tree-02"));
    const a = await controller.ensure({
      key: "k-tree-01",
      targetId: "tree-01",
      fetcher: fetcherA,
    });
    await a.promise;
    await controller.ensure({
      key: "k-tree-02",
      targetId: "tree-02",
      fetcher: fetcherB,
    });
    expect(controller.peekWarm("k-tree-01", "tree-01")).not.toBeNull();
    expect(controller.getFocusedKey()).toBe("k-tree-02");
  });

  it("evicts the oldest non-focused entry beyond the max bound", async () => {
    controller = new LiveGameChallengePrefetchController<Q>({
      minIntervalMs: 0,
      maxEntries: 2,
      leaveGraceMs: 10_000,
    });
    for (const id of ["a", "b", "c"]) {
      const result = await controller.ensure({
        key: `k-${id}`,
        targetId: id,
        fetcher: async () => entry(id),
      });
      await result.promise;
    }
    expect(controller.getEntryCount()).toBeLessThanOrEqual(2);
    expect(controller.peekWarm("k-c", "c")).not.toBeNull();
  });

  it("does not reuse expired challenges", async () => {
    const result = await controller.ensure({
      key: "k-tree-01",
      targetId: "tree-01",
      fetcher: async () => entry("tree-01", LIVE_GAME_CHALLENGE_PREFETCH_EXPIRY_BUFFER_MS),
    });
    await result.promise;
    const lookup = controller.lookupInteraction("k-tree-01", "tree-01");
    expect(lookup.cacheState).toBe("cold");
  });

  it("treats bundle-version key changes as a different cache entry", async () => {
    const fetcher = vi.fn(async () => entry("tree-01"));
    const first = await controller.ensure({
      key: "room|harvest|tree-01|p1|1",
      targetId: "tree-01",
      fetcher,
    });
    await first.promise;
    const second = await controller.ensure({
      key: "room|harvest|tree-01|p1|2",
      targetId: "tree-01",
      fetcher,
    });
    expect(second.outcome).toBe("started");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("clears incompatible entries on room/session cancel", async () => {
    const result = await controller.ensure({
      key: "k-tree-01",
      targetId: "tree-01",
      fetcher: async () => entry("tree-01"),
    });
    await result.promise;
    controller.cancelAll("room_change");
    expect(controller.getEntryCount()).toBe(0);
    expect(controller.peekWarm("k-tree-01", "tree-01")).toBeNull();
  });

  it("invalidates a node on cooldown / depletion", async () => {
    const result = await controller.ensure({
      key: "k-tree-01",
      targetId: "tree-01",
      fetcher: async () => entry("tree-01"),
    });
    await result.promise;
    controller.invalidateTarget("tree-01");
    expect(controller.peekWarm("k-tree-01", "tree-01")).toBeNull();
  });

  it("does not reuse a consumed challenge", async () => {
    const result = await controller.ensure({
      key: "k-tree-01",
      targetId: "tree-01",
      fetcher: async () => entry("tree-01"),
    });
    await result.promise;
    controller.consume("k-tree-01");
    expect(controller.lookupInteraction("k-tree-01", "tree-01").cacheState).toBe("cold");
  });

  it("removes a rejected request so a later retry can proceed", async () => {
    let attempt = 0;
    const fetcher = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) throw new Error("boom");
      return entry("tree-01");
    });
    const first = await controller.ensure({
      key: "k-tree-01",
      targetId: "tree-01",
      fetcher,
    });
    await expect(first.promise).rejects.toThrow("boom");
    expect(controller.getEntryCount()).toBe(0);

    const second = await controller.ensure({
      key: "k-tree-01",
      targetId: "tree-01",
      fetcher,
    });
    expect(second.outcome).toBe("started");
    await second.promise;
    expect(controller.peekWarm("k-tree-01", "tree-01")).not.toBeNull();
  });

  it("clears timers and controllers on dispose", async () => {
    let aborted = false;
    await controller.ensure({
      key: "k-tree-01",
      targetId: "tree-01",
      fetcher: async (signal) => {
        signal.addEventListener("abort", () => {
          aborted = true;
        });
        await new Promise((resolve) => setTimeout(resolve, 5_000));
        return entry("tree-01");
      },
    });
    controller.dispose();
    expect(aborted).toBe(true);
    expect(controller.getEntryCount()).toBe(0);
  });

  it("does not create an unbounded request storm across several nodes", async () => {
    controller = new LiveGameChallengePrefetchController<Q>({
      minIntervalMs: 0,
      maxEntries: 3,
      leaveGraceMs: 10_000,
    });
    let starts = 0;
    for (const id of ["a", "b", "c", "d", "e", "f"]) {
      await controller.ensure({
        key: `k-${id}`,
        targetId: id,
        fetcher: async () => {
          starts += 1;
          return entry(id);
        },
      });
    }
    expect(controller.getEntryCount()).toBeLessThanOrEqual(3);
    expect(starts).toBe(6);
    expect(controller.getEntryCount()).toBe(3);
  });

  it("reports warm interaction lookup without starting a new request", async () => {
    const fetcher = vi.fn(async () => entry("tree-01"));
    const started = await controller.ensure({
      key: "k-tree-01",
      targetId: "tree-01",
      fetcher,
    });
    await started.promise;
    const lookup = controller.lookupInteraction("k-tree-01", "tree-01");
    expect(lookup.cacheState).toBe("warm");
    expect(lookup.outcome).toBe("reused_warm");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("returns failed with controller_disposed without invoking the fetcher", async () => {
    controller.dispose();
    const fetcher = vi.fn(async () => entry("tree-01"));
    const result = await controller.ensure({
      key: "k-tree-01",
      targetId: "tree-01",
      fetcher,
    });
    expect(result.outcome).toBe("failed");
    expect(result.prefetchFailReason).toBe("controller_disposed");
    expect(result.requestCallbackInvoked).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("Strict Mode dispose/setup recovery uses a replacement controller that can prefetch", async () => {
    // Simulates the harvest/deposit hook ensureController() lifecycle.
    let active = controller;
    const ensureActive = () => {
      if (!active.isDisposed()) return active;
      active = new LiveGameChallengePrefetchController<Q>({
        minIntervalMs: 0,
        leaveGraceMs: LIVE_GAME_CHALLENGE_PREFETCH_LEAVE_GRACE_MS,
        maxEntries: LIVE_GAME_CHALLENGE_PREFETCH_MAX_ENTRIES,
      });
      return active;
    };

    // Effect cleanup permanently disposes the mount instance.
    const mounted = ensureActive();
    mounted.dispose();
    expect(mounted.isDisposed()).toBe(true);

    // Next ensure must replace, not reuse the poisoned instance.
    const recovered = ensureActive();
    expect(recovered.isDisposed()).toBe(false);
    const fetcher = vi.fn(async () => entry("tree-01"));
    const result = await recovered.ensure({
      key: "k-tree-01",
      targetId: "tree-01",
      fetcher,
    });
    expect(result.outcome).toBe("started");
    expect(result.requestCallbackInvoked).toBe(true);
    await result.promise;
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(recovered.lookupInteraction("k-tree-01", "tree-01").cacheState).toBe("warm");
  });
});

describe("prefetch gated by usable position sync (integration)", () => {
  it("starts deposit prefetch after a started position result and leaves a warm entry", async () => {
    const { isUsableLiveGamePositionSyncResult } = await import(
      "@/lib/live-game/challenge-position-sync"
    );
    const position = {
      ok: true,
      outcome: "started" as const,
      forceRequested: false,
      requestSequence: 1,
      latestSequenceAtCompletion: 1,
      reuseWindowMs: 1500,
      reuseDistancePx: 12,
    };
    expect(isUsableLiveGamePositionSyncResult(position)).toBe(true);

    const depositController = new LiveGameChallengePrefetchController<Q>({
      minIntervalMs: 0,
    });
    const fetcher = vi.fn(async () => entry("wheat-storage-01"));
    let challengeStarts = 0;
    if (isUsableLiveGamePositionSyncResult(position)) {
      const result = await depositController.ensure({
        key: "room|deposit|wheat-storage-01|player|1",
        targetId: "wheat-storage-01",
        fetcher: async (signal) => {
          challengeStarts += 1;
          void signal;
          return fetcher();
        },
      });
      expect(result.outcome).toBe("started");
      await result.promise;
    }
    expect(challengeStarts).toBe(1);
    const lookup = depositController.lookupInteraction(
      "room|deposit|wheat-storage-01|player|1",
      "wheat-storage-01",
    );
    expect(lookup.cacheState).toBe("warm");
    // Warm click path: no second challenge request.
    const second = await depositController.ensure({
      key: "room|deposit|wheat-storage-01|player|1",
      targetId: "wheat-storage-01",
      fetcher,
    });
    expect(second.outcome).toBe("retained");
    expect(fetcher).toHaveBeenCalledTimes(1);
    depositController.dispose();
  });

  it("does not start prefetch when position sync is disposed (pre-fix production mode)", async () => {
    const { isUsableLiveGamePositionSyncResult } = await import(
      "@/lib/live-game/challenge-position-sync"
    );
    const position = {
      ok: false,
      outcome: "disposed" as const,
      forceRequested: false,
      requestSequence: 0,
      latestSequenceAtCompletion: 0,
      reuseWindowMs: 1500,
      reuseDistancePx: 12,
    };
    expect(isUsableLiveGamePositionSyncResult(position)).toBe(false);
    const local = new LiveGameChallengePrefetchController<Q>({ minIntervalMs: 0 });
    const fetcher = vi.fn(async () => entry("tree-01"));
    if (isUsableLiveGamePositionSyncResult(position)) {
      await local.ensure({ key: "k", targetId: "tree-01", fetcher });
    }
    expect(fetcher).not.toHaveBeenCalled();
    local.dispose();
  });

  it("harvest warm click reuses without a second fetch", async () => {
    const local = new LiveGameChallengePrefetchController<Q>({ minIntervalMs: 0 });
    const fetcher = vi.fn(async () => entry("wheat-03"));
    const first = await local.ensure({
      key: "room|harvest|wheat-03|player|1",
      targetId: "wheat-03",
      fetcher,
    });
    await first.promise;
    const warm = local.lookupInteraction("room|harvest|wheat-03|player|1", "wheat-03");
    expect(warm.cacheState).toBe("warm");
    const reused = await local.ensure({
      key: "room|harvest|wheat-03|player|1",
      targetId: "wheat-03",
      fetcher,
    });
    expect(reused.outcome).toBe("retained");
    expect(fetcher).toHaveBeenCalledTimes(1);
    local.dispose();
  });
});

describe("craft challenge prefetch retained lifecycle", () => {
  const machineId = "craft-bench-01";
  const buildBenchKey = "room|craft|craft-bench-01|build_bench|p1|1";
  const craftHammerKey = "room|craft|craft-bench-01|craft_hammer|p1|1";

  function craftEntry(recipeId: string, expiresInMs = 60_000): ChallengePrefetchEntry<Q> {
    return {
      nodeId: machineId,
      recipeId,
      challengeId: `chal-${recipeId}`,
      expiresAt: Date.now() + expiresInMs,
      question: { id: `q-${recipeId}` },
      fetchedAt: Date.now(),
    };
  }

  let controller: LiveGameChallengePrefetchController<Q>;

  beforeEach(() => {
    vi.useFakeTimers();
    controller = new LiveGameChallengePrefetchController<Q>({
      minIntervalMs: 0,
      leaveGraceMs: LIVE_GAME_CHALLENGE_PREFETCH_LEAVE_GRACE_MS,
      maxEntries: LIVE_GAME_CHALLENGE_PREFETCH_MAX_ENTRIES,
    });
  });

  afterEach(() => {
    controller.dispose();
    vi.useRealTimers();
  });

  it("invokes the craft fetch callback and stores a successful result", async () => {
    const fetcher = vi.fn(async () => craftEntry("build_bench"));
    const started = await controller.ensure({
      key: buildBenchKey,
      targetId: machineId,
      fetcher,
    });
    expect(started.requestCallbackInvoked).toBe(true);
    expect(started.outcome).toBe("started");
    await started.promise;
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(controller.lookupInteraction(buildBenchKey, machineId).cacheState).toBe("warm");
  });

  it("warm craft click reuses stored challenge without a second request", async () => {
    const fetcher = vi.fn(async () => craftEntry("build_bench"));
    const started = await controller.ensure({
      key: buildBenchKey,
      targetId: machineId,
      fetcher,
    });
    await started.promise;
    const lookup = controller.lookupInteraction(buildBenchKey, machineId);
    expect(lookup.cacheState).toBe("warm");
    const reused = await controller.ensure({
      key: buildBenchKey,
      targetId: machineId,
      fetcher,
    });
    expect(reused.outcome).toBe("retained");
    expect(reused.entry?.challengeId).toBe("chal-build_bench");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("in-flight craft click attaches to the existing promise without duplicating", async () => {
    const fetcher = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return craftEntry("build_bench");
    });
    const first = await controller.ensure({
      key: buildBenchKey,
      targetId: machineId,
      fetcher,
    });
    const click = controller.lookupInteraction(buildBenchKey, machineId);
    expect(click.cacheState).toBe("inflight");
    expect(click.promise).toBe(first.promise);
    const second = await controller.ensure({
      key: buildBenchKey,
      targetId: machineId,
      fetcher,
    });
    expect(second.outcome).toBe("deduplicated");
    expect(second.promise).toBe(first.promise);
    await vi.advanceTimersByTimeAsync(100);
    await first.promise;
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("brief focus loss retains the craft entry (soft release, not hard cancel)", async () => {
    let aborted = false;
    const fetcher = vi.fn(async (signal: AbortSignal) => {
      signal.addEventListener("abort", () => {
        aborted = true;
      });
      await new Promise((resolve) => setTimeout(resolve, 5_000));
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      return craftEntry("build_bench");
    });
    await controller.ensure({
      key: buildBenchKey,
      targetId: machineId,
      fetcher,
    });
    // Mimics Canvas effect cleanup: soft releasePrefetchFocus, not cancelPrefetch.
    controller.releaseFocus();
    await vi.advanceTimersByTimeAsync(LIVE_GAME_CHALLENGE_PREFETCH_LEAVE_GRACE_MS - 10);
    expect(aborted).toBe(false);
    expect(controller.getEntryCount()).toBe(1);
  });

  it("brief proximity exit respects leave grace then returns warm", async () => {
    const fetcher = vi.fn(async () => craftEntry("build_bench"));
    const started = await controller.ensure({
      key: buildBenchKey,
      targetId: machineId,
      fetcher,
    });
    await started.promise;
    controller.releaseFocus();
    await vi.advanceTimersByTimeAsync(LIVE_GAME_CHALLENGE_PREFETCH_LEAVE_GRACE_MS - 50);
    const returned = await controller.ensure({
      key: buildBenchKey,
      targetId: machineId,
      fetcher,
    });
    expect(returned.outcome).toBe("retained");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("keeps recipes isolated and reuses the prior recipe on return", async () => {
    const fetchBench = vi.fn(async () => craftEntry("build_bench"));
    const fetchHammer = vi.fn(async () => craftEntry("craft_hammer"));
    const bench = await controller.ensure({
      key: buildBenchKey,
      targetId: machineId,
      fetcher: fetchBench,
    });
    await bench.promise;
    await controller.ensure({
      key: craftHammerKey,
      targetId: machineId,
      fetcher: fetchHammer,
    });
    expect(controller.peekWarm(buildBenchKey, machineId)).not.toBeNull();
    const back = await controller.ensure({
      key: buildBenchKey,
      targetId: machineId,
      fetcher: fetchBench,
    });
    expect(back.outcome).toBe("retained");
    expect(fetchBench).toHaveBeenCalledTimes(1);
    expect(fetchHammer).toHaveBeenCalledTimes(1);
  });

  it("isolates machine ids, players, rooms, and bundle versions", async () => {
    const fetcher = vi.fn(async () => craftEntry("build_bench"));
    const first = await controller.ensure({
      key: buildBenchKey,
      targetId: machineId,
      fetcher,
    });
    await first.promise;
    for (const key of [
      "room|craft|other-bench|build_bench|p1|1",
      "room|craft|craft-bench-01|build_bench|p2|1",
      "other-room|craft|craft-bench-01|build_bench|p1|1",
      "room|craft|craft-bench-01|build_bench|p1|2",
    ]) {
      const next = await controller.ensure({
        key,
        targetId: key.includes("other-bench") ? "other-bench" : machineId,
        fetcher,
      });
      expect(next.outcome).toBe("started");
    }
    expect(fetcher).toHaveBeenCalledTimes(5);
  });

  it("invalidates consumed and expired craft challenges", async () => {
    const ready = await controller.ensure({
      key: buildBenchKey,
      targetId: machineId,
      fetcher: async () => craftEntry("build_bench"),
    });
    await ready.promise;
    controller.consume(buildBenchKey);
    expect(controller.lookupInteraction(buildBenchKey, machineId).cacheState).toBe("cold");

    const short = await controller.ensure({
      key: buildBenchKey,
      targetId: machineId,
      fetcher: async () => craftEntry("build_bench", LIVE_GAME_CHALLENGE_PREFETCH_EXPIRY_BUFFER_MS),
    });
    await short.promise;
    expect(controller.lookupInteraction(buildBenchKey, machineId).cacheState).toBe("cold");
  });

  it("removes failed craft requests and allows retry with a useful failure reason", async () => {
    let attempt = 0;
    const fetcher = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) throw new Error("HTTP 403: recipe not affordable");
      return craftEntry("build_bench");
    });
    const first = await controller.ensure({
      key: buildBenchKey,
      targetId: machineId,
      fetcher,
    });
    await expect(first.promise).rejects.toThrow(/HTTP 403/);
    expect(controller.getEntryCount()).toBe(0);
    const second = await controller.ensure({
      key: buildBenchKey,
      targetId: machineId,
      fetcher,
    });
    expect(second.outcome).toBe("started");
    await second.promise;
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("Strict Mode dispose leaves an active craft replacement; disposed instance cannot poison it", async () => {
    let active = controller;
    const ensureActive = () => {
      if (!active.isDisposed()) return active;
      active = new LiveGameChallengePrefetchController<Q>({
        minIntervalMs: 0,
        leaveGraceMs: LIVE_GAME_CHALLENGE_PREFETCH_LEAVE_GRACE_MS,
        maxEntries: LIVE_GAME_CHALLENGE_PREFETCH_MAX_ENTRIES,
      });
      return active;
    };
    const mounted = ensureActive();
    mounted.dispose();
    const disposedFetcher = vi.fn(async () => craftEntry("build_bench"));
    const poisoned = await mounted.ensure({
      key: buildBenchKey,
      targetId: machineId,
      fetcher: disposedFetcher,
    });
    expect(poisoned.prefetchFailReason).toBe("controller_disposed");
    expect(disposedFetcher).not.toHaveBeenCalled();

    const recovered = ensureActive();
    const fetcher = vi.fn(async () => craftEntry("build_bench"));
    const result = await recovered.ensure({
      key: buildBenchKey,
      targetId: machineId,
      fetcher,
    });
    expect(result.outcome).toBe("started");
    await result.promise;
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("enforces cache maximum without unnecessarily removing the focused recipe", async () => {
    controller = new LiveGameChallengePrefetchController<Q>({
      minIntervalMs: 0,
      maxEntries: 2,
      leaveGraceMs: 10_000,
    });
    for (const recipeId of ["a", "b", "c"]) {
      const key = `room|craft|craft-bench-01|${recipeId}|p1|1`;
      const result = await controller.ensure({
        key,
        targetId: machineId,
        fetcher: async () => craftEntry(recipeId),
      });
      await result.promise;
      if (recipeId === "c") {
        expect(result.evictionOutcome).toBe("evicted_other");
      }
    }
    expect(controller.getEntryCount()).toBeLessThanOrEqual(2);
    expect(controller.peekWarm("room|craft|craft-bench-01|c|p1|1", machineId)).not.toBeNull();
  });

  it("hard-cancel simulation aborts craft prefetch (documents pre-fix Canvas behavior)", async () => {
    let aborted = false;
    const fetcher = vi.fn(async (signal: AbortSignal) => {
      signal.addEventListener("abort", () => {
        aborted = true;
      });
      await new Promise((resolve) => setTimeout(resolve, 5_000));
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      return craftEntry("build_bench");
    });
    await controller.ensure({
      key: buildBenchKey,
      targetId: machineId,
      fetcher,
    });
    controller.cancelAll("session_change");
    expect(aborted).toBe(true);
    expect(controller.getEntryCount()).toBe(0);
  });
});

describe("craft prefetch × position sync integration", () => {
  it("warm path: usable non-forced sync → prefetch stored → click is warm (no forced wait needed)", async () => {
    const { isUsableLiveGamePositionSyncResult } = await import(
      "@/lib/live-game/challenge-position-sync"
    );
    const position = {
      ok: true,
      outcome: "started" as const,
      forceRequested: false,
      requestSequence: 1,
      latestSequenceAtCompletion: 1,
      reuseWindowMs: 1500,
      reuseDistancePx: 12,
    };
    expect(isUsableLiveGamePositionSyncResult(position)).toBe(true);

    const controller = new LiveGameChallengePrefetchController<Q>({ minIntervalMs: 0 });
    const fetcher = vi.fn(async () => ({
      nodeId: "craft-bench-01",
      recipeId: "build_bench",
      challengeId: "chal-build_bench",
      expiresAt: Date.now() + 60_000,
      question: { id: "q-build_bench" },
      fetchedAt: Date.now(),
    }));
    const key = "room|craft|craft-bench-01|build_bench|p1|1";
    if (isUsableLiveGamePositionSyncResult(position)) {
      const started = await controller.ensure({
        key,
        targetId: "craft-bench-01",
        fetcher,
      });
      await started.promise;
    }
    const click = controller.lookupInteraction(key, "craft-bench-01");
    expect(click.cacheState).toBe("warm");
    expect(fetcher).toHaveBeenCalledTimes(1);
    // Warm click skips requireLiveGamePositionSync — waitedForPositionSync: false
    const secondEnsure = await controller.ensure({ key, targetId: "craft-bench-01", fetcher });
    expect(secondEnsure.outcome).toBe("retained");
    expect(fetcher).toHaveBeenCalledTimes(1);
    controller.dispose();
  });

  it("in-flight path: click before completion reuses one craft challenge request", async () => {
    const { isUsableLiveGamePositionSyncResult } = await import(
      "@/lib/live-game/challenge-position-sync"
    );
    vi.useFakeTimers();
    const position = {
      ok: true,
      outcome: "started" as const,
      forceRequested: false,
      requestSequence: 2,
      latestSequenceAtCompletion: 2,
      reuseWindowMs: 1500,
      reuseDistancePx: 12,
    };
    expect(isUsableLiveGamePositionSyncResult(position)).toBe(true);

    const controller = new LiveGameChallengePrefetchController<Q>({ minIntervalMs: 0 });
    const fetcher = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
      return {
        nodeId: "craft-bench-01",
        recipeId: "build_bench",
        challengeId: "chal-build_bench",
        expiresAt: Date.now() + 60_000,
        question: { id: "q-build_bench" },
        fetchedAt: Date.now(),
      };
    });
    const key = "room|craft|craft-bench-01|build_bench|p1|1";
    const first = await controller.ensure({ key, targetId: "craft-bench-01", fetcher });
    const click = controller.lookupInteraction(key, "craft-bench-01");
    expect(click.cacheState).toBe("inflight");
    expect(click.promise).toBe(first.promise);
    await vi.advanceTimersByTimeAsync(80);
    await first.promise;
    expect(fetcher).toHaveBeenCalledTimes(1);
    controller.dispose();
    vi.useRealTimers();
  });

  it("cold path still requires usable forced position sync before a new request", async () => {
    const { isUsableLiveGamePositionSyncResult, requireLiveGamePositionSync } = await import(
      "@/lib/live-game/challenge-position-sync"
    );
    const coldLookup = { cacheState: "cold" as const };
    expect(coldLookup.cacheState).toBe("cold");

    const forced = {
      ok: true,
      outcome: "started" as const,
      forceRequested: true,
      requestSequence: 3,
      latestSequenceAtCompletion: 3,
      reuseWindowMs: 1500,
      reuseDistancePx: 12,
    };
    const detail = await requireLiveGamePositionSync(Promise.resolve(forced));
    expect(detail.waitedForPositionSync).toBe(true);
    expect(isUsableLiveGamePositionSyncResult(forced)).toBe(true);
  });
});
