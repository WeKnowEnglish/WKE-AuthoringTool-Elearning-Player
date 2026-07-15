import {
  canStartChallengePrefetch,
  challengeRemainingValidityMs,
  hashChallengePrefetchKey,
  isChallengePrefetchValid,
  LIVE_GAME_CHALLENGE_PREFETCH_LEAVE_GRACE_MS,
  LIVE_GAME_CHALLENGE_PREFETCH_MAX_ENTRIES,
  LIVE_GAME_CHALLENGE_PREFETCH_MIN_INTERVAL_MS,
  type ChallengePrefetchCancelReason,
  type ChallengePrefetchEntry,
  type ChallengePrefetchOutcome,
} from "@/lib/live-game/challenge-prefetch";

export type ChallengePrefetchFailReason =
  | "controller_disposed"
  | "controller_rejected"
  | "rate_limited"
  | "request_aborted"
  | "request_http_error"
  | "request_parse_error"
  | "challenge_invalid"
  | "expired_before_store"
  | "request_not_started"
  | "position_not_ready"
  | "position_failed"
  | "position_disposed"
  | "position_context_changed"
  | "position_result_unusable";

export type PrefetchEnsureResult<TQuestion> = {
  outcome: ChallengePrefetchOutcome;
  entry?: ChallengePrefetchEntry<TQuestion>;
  promise?: Promise<ChallengePrefetchEntry<TQuestion>>;
  keyHash: string;
  cancelReason?: ChallengePrefetchCancelReason;
  retentionAgeMs?: number;
  inFlightAgeMs?: number;
  challengeRemainingValidityMs?: number;
  /** True when ensure queued or reused a fetcher promise (callback will/already ran). */
  requestCallbackInvoked?: boolean;
  prefetchFailReason?: ChallengePrefetchFailReason;
  /** Set when ensure triggered eviction to stay within maxEntries. */
  evictionOutcome?: "none" | "evicted_other" | "skipped_focused";
};

type Slot<TQuestion> = {
  key: string;
  keyHash: string;
  targetId: string;
  status: "in_flight" | "resolved";
  promise: Promise<ChallengePrefetchEntry<TQuestion>>;
  entry: ChallengePrefetchEntry<TQuestion> | null;
  controller: AbortController | null;
  startedAt: number;
  lastTouchedAt: number;
  retainedUntil: number | null;
};

type ValidityOptions = {
  cooldownEndsAt?: number | null;
  expiryBufferMs?: number;
};

/**
 * Bounded per-hook controller for harvest/deposit/craft challenge prefetches.
 * Separates visual focus from retained entries and delays abort with a leave grace.
 */
export class LiveGameChallengePrefetchController<TQuestion> {
  private readonly slots = new Map<string, Slot<TQuestion>>();
  private readonly graceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private focusedKey: string | null = null;
  private lastStartAt = 0;
  private disposed = false;
  private readonly maxEntries: number;
  private readonly leaveGraceMs: number;
  private readonly minIntervalMs: number;

  constructor(options?: {
    maxEntries?: number;
    leaveGraceMs?: number;
    minIntervalMs?: number;
  }) {
    this.maxEntries = options?.maxEntries ?? LIVE_GAME_CHALLENGE_PREFETCH_MAX_ENTRIES;
    this.leaveGraceMs = options?.leaveGraceMs ?? LIVE_GAME_CHALLENGE_PREFETCH_LEAVE_GRACE_MS;
    this.minIntervalMs = options?.minIntervalMs ?? LIVE_GAME_CHALLENGE_PREFETCH_MIN_INTERVAL_MS;
  }

  getFocusedKey() {
    return this.focusedKey;
  }

  getEntryCount() {
    return this.slots.size;
  }

  peekWarm(
    key: string,
    targetId: string,
    now = Date.now(),
    validity?: ValidityOptions,
  ): ChallengePrefetchEntry<TQuestion> | null {
    const slot = this.slots.get(key);
    if (!slot?.entry || slot.status !== "resolved") return null;
    if (!isChallengePrefetchValid(slot.entry, targetId, now, validity)) return null;
    slot.lastTouchedAt = now;
    return slot.entry;
  }

  peekInFlight(key: string): Promise<ChallengePrefetchEntry<TQuestion>> | null {
    const slot = this.slots.get(key);
    if (!slot || slot.status !== "in_flight") return null;
    slot.lastTouchedAt = Date.now();
    return slot.promise;
  }

  /** Move visual focus without aborting the previous target (schedules leave grace). */
  setFocus(key: string | null) {
    if (this.disposed) return;
    const previous = this.focusedKey;
    this.focusedKey = key;
    if (key) {
      this.clearGraceTimer(key);
      const focused = this.slots.get(key);
      if (focused) {
        focused.retainedUntil = null;
        focused.lastTouchedAt = Date.now();
      }
    }
    if (previous && previous !== key) {
      this.scheduleLeaveGrace(previous);
    }
  }

  /**
   * Soft-release current (or given) focus. In-flight work may finish; warm entries
   * stay until grace expires or validity fails.
   */
  releaseFocus(key?: string | null) {
    if (this.disposed) return;
    const target = key === undefined ? this.focusedKey : key;
    if (this.focusedKey != null && (key === undefined || key === this.focusedKey)) {
      this.focusedKey = null;
    }
    if (target) this.scheduleLeaveGrace(target);
  }

  /** Hard abort everything (room/session teardown, permanent unmount). */
  cancelAll(reason: ChallengePrefetchCancelReason = "session_change") {
    for (const key of [...this.slots.keys()]) {
      this.removeSlot(key, reason === "dispose" ? "dispose" : reason, true);
    }
    this.focusedKey = null;
  }

  dispose() {
    this.disposed = true;
    this.cancelAll("dispose");
  }

  isDisposed() {
    return this.disposed;
  }

  invalidateTarget(targetId: string) {
    for (const [key, slot] of this.slots) {
      if (slot.targetId === targetId) {
        this.removeSlot(key, "invalid_node", true);
      }
    }
  }

  invalidateKey(key: string, reason: ChallengePrefetchCancelReason = "invalid_node") {
    this.removeSlot(key, reason, true);
  }

  consume(key: string) {
    this.removeSlot(key, "consumed", true);
  }

  async ensure(
    input: {
      key: string;
      targetId: string;
      now?: number;
      validity?: ValidityOptions;
      fetcher: (signal: AbortSignal) => Promise<ChallengePrefetchEntry<TQuestion>>;
    },
  ): Promise<PrefetchEnsureResult<TQuestion>> {
    const now = input.now ?? Date.now();
    const keyHash = hashChallengePrefetchKey(input.key);
    if (this.disposed) {
      return {
        outcome: "failed",
        keyHash,
        cancelReason: "dispose",
        prefetchFailReason: "controller_disposed",
        requestCallbackInvoked: false,
      };
    }

    this.setFocus(input.key);

    const warm = this.peekWarm(input.key, input.targetId, now, input.validity);
    if (warm) {
      return {
        outcome: "retained",
        entry: warm,
        keyHash,
        challengeRemainingValidityMs: challengeRemainingValidityMs(warm.expiresAt, now),
        requestCallbackInvoked: false,
      };
    }

    const existing = this.slots.get(input.key);
    if (existing?.status === "in_flight") {
      return {
        outcome: "deduplicated",
        promise: existing.promise,
        keyHash,
        inFlightAgeMs: Math.max(0, now - existing.startedAt),
        requestCallbackInvoked: true,
      };
    }

    if (existing?.status === "resolved" && existing.entry) {
      // Present but invalid at this validity check — drop and refetch when allowed.
      this.removeSlot(input.key, "invalid_node", true);
    }

    if (!canStartChallengePrefetch(this.lastStartAt, now, this.minIntervalMs)) {
      return {
        outcome: "retained",
        keyHash,
        prefetchFailReason: "rate_limited",
        requestCallbackInvoked: false,
      };
    }

    const evictionOutcome = this.evictIfNeeded(input.key);
    this.lastStartAt = now;
    const abortController = new AbortController();
    const startedAt = now;
    const slotHolder: { promise: Promise<ChallengePrefetchEntry<TQuestion>> | null } = {
      promise: null,
    };
    const promise = (async () => {
      try {
        const entry = await input.fetcher(abortController.signal);
        if (this.disposed || abortController.signal.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }
        const slot = this.slots.get(input.key);
        if (!slot || slot.promise !== slotHolder.promise) {
          return entry;
        }
        slot.status = "resolved";
        slot.entry = entry;
        slot.controller = null;
        slot.lastTouchedAt = Date.now();
        return entry;
      } catch (error) {
        const aborted =
          abortController.signal.aborted ||
          (error instanceof DOMException && error.name === "AbortError");
        if (!aborted) {
          this.removeSlot(input.key, "failed", false);
        }
        throw error;
      } finally {
        const slot = this.slots.get(input.key);
        if (slot?.controller === abortController) {
          slot.controller = null;
        }
      }
    })();
    slotHolder.promise = promise;

    // Avoid unhandled rejection if nobody awaits immediately.
    void promise.catch(() => undefined);

    this.slots.set(input.key, {
      key: input.key,
      keyHash,
      targetId: input.targetId,
      status: "in_flight",
      promise,
      entry: null,
      controller: abortController,
      startedAt,
      lastTouchedAt: startedAt,
      retainedUntil: null,
    });

    return {
      outcome: "started",
      promise,
      keyHash,
      inFlightAgeMs: 0,
      requestCallbackInvoked: true,
      evictionOutcome,
    };
  }

  lookupInteraction(
    key: string,
    targetId: string,
    now = Date.now(),
    validity?: ValidityOptions,
  ): {
    cacheState: "warm" | "inflight" | "cold";
    outcome: ChallengePrefetchOutcome | null;
    entry: ChallengePrefetchEntry<TQuestion> | null;
    promise: Promise<ChallengePrefetchEntry<TQuestion>> | null;
    keyHash: string;
    retentionAgeMs?: number;
    inFlightAgeMs?: number;
    challengeRemainingValidityMs?: number;
  } {
    const keyHash = hashChallengePrefetchKey(key);
    const warm = this.peekWarm(key, targetId, now, validity);
    if (warm) {
      const slot = this.slots.get(key);
      return {
        cacheState: "warm",
        outcome: "reused_warm",
        entry: warm,
        promise: null,
        keyHash,
        retentionAgeMs: slot ? Math.max(0, now - slot.startedAt) : undefined,
        challengeRemainingValidityMs: challengeRemainingValidityMs(warm.expiresAt, now),
      };
    }
    const inflight = this.peekInFlight(key);
    if (inflight) {
      const slot = this.slots.get(key)!;
      return {
        cacheState: "inflight",
        outcome: "reused_inflight",
        entry: null,
        promise: inflight,
        keyHash,
        inFlightAgeMs: Math.max(0, now - slot.startedAt),
      };
    }
    return {
      cacheState: "cold",
      outcome: null,
      entry: null,
      promise: null,
      keyHash,
    };
  }

  /** Test helper: force grace timers to fire. */
  flushGraceForTests(now = Date.now()) {
    for (const [key, slot] of [...this.slots]) {
      if (slot.retainedUntil != null && slot.retainedUntil <= now && this.focusedKey !== key) {
        this.removeSlot(key, "leave_grace", true);
      }
    }
  }

  private scheduleLeaveGrace(key: string) {
    if (this.disposed || this.focusedKey === key) return;
    this.clearGraceTimer(key);
    const slot = this.slots.get(key);
    if (!slot) return;
    const retainedUntil = Date.now() + this.leaveGraceMs;
    slot.retainedUntil = retainedUntil;
    const timer = setTimeout(() => {
      this.graceTimers.delete(key);
      if (this.disposed || this.focusedKey === key) return;
      this.removeSlot(key, "leave_grace", true);
    }, this.leaveGraceMs);
    this.graceTimers.set(key, timer);
  }

  private clearGraceTimer(key: string) {
    const timer = this.graceTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.graceTimers.delete(key);
    }
    const slot = this.slots.get(key);
    if (slot) slot.retainedUntil = null;
  }

  private evictIfNeeded(incomingKey: string): "none" | "evicted_other" | "skipped_focused" {
    if (this.slots.has(incomingKey) || this.slots.size < this.maxEntries) return "none";
    const candidates = [...this.slots.values()]
      .filter((slot) => slot.key !== this.focusedKey)
      .sort((a, b) => a.lastTouchedAt - b.lastTouchedAt);
    const victim = candidates[0];
    if (!victim) {
      // All slots are focused somehow — abort oldest non-incoming.
      const oldest = [...this.slots.values()].sort((a, b) => a.lastTouchedAt - b.lastTouchedAt)[0];
      if (oldest && oldest.key !== incomingKey) {
        this.removeSlot(oldest.key, "evicted", true);
        return "evicted_other";
      }
      return "skipped_focused";
    }
    this.removeSlot(victim.key, "evicted", true);
    return "evicted_other";
  }

  private removeSlot(
    key: string,
    reason: ChallengePrefetchCancelReason,
    abortInFlight: boolean,
  ) {
    this.clearGraceTimer(key);
    const slot = this.slots.get(key);
    if (!slot) return;
    if (abortInFlight && slot.controller && !slot.controller.signal.aborted) {
      slot.controller.abort();
    }
    this.slots.delete(key);
    if (this.focusedKey === key && reason !== "consumed") {
      // Focus cleared only when forcibly removed without a replacement setFocus.
      if (reason === "leave_grace" || reason === "dispose" || reason === "session_change" || reason === "room_change" || reason === "player_change" || reason === "bundle_version_change") {
        this.focusedKey = null;
      }
    }
    void reason;
  }
}
