/**
 * Client-side interaction position synchronization for Live Game.
 *
 * Lifecycle:
 *   idle → sync requested → request in flight → successful | failed
 *   successful → reusable (within time/distance window) | stale
 *   in flight → deduplicated (equivalent coords) | superseded (older response)
 *   context update → invalidate incompatible state, keep controller usable
 *   not_ready → context missing (room/player/session)
 *   permanent dispose → only on owning unmount; replacement controller is independent
 *
 * Authoritative proximity validation remains on the server via Storage playerPositions.
 */

/** Recent successful syncs within this window may be reused (non-forced). */
export const LIVE_GAME_INTERACTION_POSITION_REUSE_MS = 1_500;

/** Player may move this many pixels from the last successful sync and still reuse it. */
export const LIVE_GAME_INTERACTION_POSITION_REUSE_DISTANCE_PX = 12;

/** In-flight requests within this distance are treated as the same synchronization. */
export const LIVE_GAME_INTERACTION_POSITION_INFLIGHT_SAME_PX = 2;

export type PositionSyncOutcome =
  | "started"
  | "deduplicated_inflight"
  | "reused_recent"
  | "forced_started"
  | "forced_reused_inflight"
  | "superseded"
  | "aborted_context_change"
  | "not_ready"
  | "disposed"
  | "failed";

export type PositionSyncAbortReason =
  | "missing_room"
  | "missing_player"
  | "missing_session"
  | "controller_disposed"
  | "context_generation_mismatch"
  | "stale_callback"
  | "game_not_playing"
  | "permanent_unmount"
  | null;

export type PositionSyncResult = {
  ok: boolean;
  outcome: PositionSyncOutcome;
  forceRequested: boolean;
  requestSequence: number;
  latestSequenceAtCompletion: number;
  positionAgeMs?: number;
  movementDeltaPx?: number;
  reuseWindowMs: number;
  reuseDistancePx: number;
  inFlightAgeMs?: number;
  sharedConsumerCount?: number;
  syncKeyHash?: string | null;
  abortReason?: PositionSyncAbortReason;
  controllerInstanceIdHash?: string;
  controllerContextGeneration?: number;
  requestedContextGeneration?: number;
  hasRoomId?: boolean;
  hasPlayerId?: boolean;
  isDisposed?: boolean;
  contextReady?: boolean;
  requestReachedFetch?: boolean;
};

export type PositionSyncContext = {
  roomId: string;
  playerId: string;
  sessionGeneration: number;
};

type LastSuccess = {
  position: { x: number; y: number };
  syncedAt: number;
  sequence: number;
  contextKey: string;
};

type InFlightEntry = {
  syncKey: string;
  position: { x: number; y: number };
  sequence: number;
  startedAt: number;
  forceRequested: boolean;
  consumerCount: number;
  promise: Promise<PositionSyncResult>;
  /** Serializes materially different sync requests that arrive during an active write. */
  followUp?: Promise<PositionSyncResult>;
};

let nextControllerInstanceId = 1;

export function normalizeInteractionPosition(position: { x: number; y: number }) {
  return {
    x: Math.round(position.x * 10) / 10,
    y: Math.round(position.y * 10) / 10,
  };
}

export function positionDistancePx(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function positionsWithinPx(
  a: { x: number; y: number },
  b: { x: number; y: number },
  thresholdPx: number,
): boolean {
  return positionDistancePx(a, b) <= thresholdPx;
}

export function buildInteractionPositionSyncKey(
  context: PositionSyncContext,
  position: { x: number; y: number },
): string {
  const normalized = normalizeInteractionPosition(position);
  return `${context.roomId}|${context.playerId}|${context.sessionGeneration}|${normalized.x}|${normalized.y}`;
}

/** Non-sensitive fingerprint for diagnostics. */
export function hashInteractionPositionSyncKey(key: string): string {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function buildContextKey(context: PositionSyncContext): string {
  return `${context.roomId}|${context.playerId}|${context.sessionGeneration}`;
}

export function isPositionSyncContextReady(context: {
  roomId?: string | null;
  playerId?: string | null;
  sessionGeneration?: number | null;
}): { ready: true; context: PositionSyncContext } | { ready: false; reason: PositionSyncAbortReason } {
  if (!context.roomId) return { ready: false, reason: "missing_room" };
  if (!context.playerId) return { ready: false, reason: "missing_player" };
  if (context.sessionGeneration == null || context.sessionGeneration < 1) {
    return { ready: false, reason: "missing_session" };
  }
  return {
    ready: true,
    context: {
      roomId: context.roomId,
      playerId: context.playerId,
      sessionGeneration: context.sessionGeneration,
    },
  };
}

export class InteractionPositionSyncController {
  private readonly instanceId: number;
  private readonly instanceIdHash: string;
  private context: PositionSyncContext | null = null;
  private lastSuccess: LastSuccess | null = null;
  private inFlight: InFlightEntry | null = null;
  private latestRequestSequence = 0;
  private latestAppliedSequence = 0;
  private disposed = false;

  constructor() {
    this.instanceId = nextControllerInstanceId;
    nextControllerInstanceId += 1;
    this.instanceIdHash = hashInteractionPositionSyncKey(`controller:${this.instanceId}`);
  }

  isDisposed() {
    return this.disposed;
  }

  getInstanceIdHash() {
    return this.instanceIdHash;
  }

  getContextGeneration() {
    return this.context?.sessionGeneration ?? 0;
  }

  setContext(context: PositionSyncContext) {
    if (this.disposed) {
      // Permanent dispose must not be undone. Callers must create a replacement instance.
      return false;
    }
    const nextKey = buildContextKey(context);
    const currentKey = this.context ? buildContextKey(this.context) : null;
    if (currentKey === nextKey) {
      this.context = context;
      return true;
    }
    this.resetCache();
    this.context = context;
    return true;
  }

  /**
   * Permanently disable this instance. Ordinary rerenders, phase changes, and
   * context updates must not call this — only permanent owning-unmount cleanup.
   */
  dispose(reason: PositionSyncAbortReason = "permanent_unmount") {
    void reason;
    this.disposed = true;
    this.resetCache();
    this.context = null;
  }

  private resetCache() {
    this.inFlight = null;
    this.lastSuccess = null;
    this.latestRequestSequence = 0;
    this.latestAppliedSequence = 0;
  }

  getContext() {
    return this.context;
  }

  sync(input: {
    position: { x: number; y: number };
    readPosition?: () => { x: number; y: number };
    force?: boolean;
    now?: number;
    publish: (position: { x: number; y: number }) => Promise<Response>;
  }): Promise<PositionSyncResult> {
    const now = input.now ?? Date.now();
    const forceRequested = input.force === true;
    const position = normalizeInteractionPosition(input.position);

    if (this.disposed) {
      return Promise.resolve(
        this.rejectResult({
          forceRequested,
          outcome: "disposed",
          abortReason: "controller_disposed",
          requestSequence: 0,
        }),
      );
    }

    if (!this.context) {
      return Promise.resolve(
        this.rejectResult({
          forceRequested,
          outcome: "not_ready",
          abortReason: "missing_session",
          requestSequence: 0,
        }),
      );
    }

    const contextKey = buildContextKey(this.context);
    const syncKey = buildInteractionPositionSyncKey(this.context, position);
    const syncKeyHash = hashInteractionPositionSyncKey(syncKey);
    const requestedContextGeneration = this.context.sessionGeneration;

    if (!forceRequested && this.canReuseRecent(position, now, contextKey)) {
      const last = this.lastSuccess!;
      return Promise.resolve({
        ok: true,
        outcome: "reused_recent",
        forceRequested,
        requestSequence: last.sequence,
        latestSequenceAtCompletion: this.latestAppliedSequence,
        positionAgeMs: Math.max(0, now - last.syncedAt),
        movementDeltaPx: positionDistancePx(position, last.position),
        reuseWindowMs: LIVE_GAME_INTERACTION_POSITION_REUSE_MS,
        reuseDistancePx: LIVE_GAME_INTERACTION_POSITION_REUSE_DISTANCE_PX,
        syncKeyHash,
        abortReason: null,
        ...this.lifecycleFields(requestedContextGeneration),
        requestReachedFetch: false,
      });
    }

    const inflight = this.inFlight;
    if (inflight) {
      if (positionsWithinPx(position, inflight.position, LIVE_GAME_INTERACTION_POSITION_INFLIGHT_SAME_PX)) {
        inflight.consumerCount += 1;
        return inflight.promise.then((result) => ({
          ...result,
          outcome: forceRequested ? "forced_reused_inflight" : "deduplicated_inflight",
          forceRequested,
          inFlightAgeMs: Math.max(0, now - inflight.startedAt),
          sharedConsumerCount: inflight.consumerCount,
          syncKeyHash,
          ...this.lifecycleFields(requestedContextGeneration),
        }));
      }

      const runAfter = inflight.followUp ?? inflight.promise;
      const next = runAfter.then((previous) => {
        if (this.disposed) {
          return this.rejectResult({
            forceRequested,
            outcome: "disposed",
            abortReason: "controller_disposed",
            requestSequence: this.latestRequestSequence,
            syncKeyHash,
            requestedContextGeneration,
          });
        }
        if (!this.context) {
          return this.rejectResult({
            forceRequested,
            outcome: "aborted_context_change",
            abortReason: "context_generation_mismatch",
            requestSequence: this.latestRequestSequence,
            syncKeyHash,
            requestedContextGeneration,
          });
        }
        if (!previous.ok) {
          return {
            ...previous,
            forceRequested,
            syncKeyHash,
            ...this.lifecycleFields(requestedContextGeneration),
          };
        }
        const latest = normalizeInteractionPosition(input.readPosition?.() ?? position);
        const latestKey = buildInteractionPositionSyncKey(this.context, latest);
        return this.startNetworkSync({
          position: latest,
          forceRequested,
          now: Date.now(),
          publish: input.publish,
          syncKey: latestKey,
          syncKeyHash: hashInteractionPositionSyncKey(latestKey),
          requestedContextGeneration: this.context.sessionGeneration,
        });
      });
      inflight.followUp = next;
      void next.catch(() => undefined);
      return next;
    }

    return this.startNetworkSync({
      position,
      forceRequested,
      now,
      publish: input.publish,
      syncKey,
      syncKeyHash,
      requestedContextGeneration,
    });
  }

  private canReuseRecent(
    position: { x: number; y: number },
    now: number,
    contextKey: string,
  ): boolean {
    const last = this.lastSuccess;
    if (!last || last.contextKey !== contextKey) return false;
    if (now - last.syncedAt > LIVE_GAME_INTERACTION_POSITION_REUSE_MS) return false;
    if (
      !positionsWithinPx(
        position,
        last.position,
        LIVE_GAME_INTERACTION_POSITION_REUSE_DISTANCE_PX,
      )
    ) {
      return false;
    }
    if (last.sequence < this.latestAppliedSequence) return false;
    return true;
  }

  private startNetworkSync(input: {
    position: { x: number; y: number };
    forceRequested: boolean;
    now: number;
    publish: (position: { x: number; y: number }) => Promise<Response>;
    syncKey: string;
    syncKeyHash: string;
    requestedContextGeneration: number;
  }): Promise<PositionSyncResult> {
    if (this.disposed) {
      return Promise.resolve(
        this.rejectResult({
          forceRequested: input.forceRequested,
          outcome: "disposed",
          abortReason: "controller_disposed",
          requestSequence: this.latestRequestSequence,
          syncKeyHash: input.syncKeyHash,
          requestedContextGeneration: input.requestedContextGeneration,
        }),
      );
    }
    if (!this.context) {
      return Promise.resolve(
        this.rejectResult({
          forceRequested: input.forceRequested,
          outcome: "not_ready",
          abortReason: "missing_session",
          requestSequence: this.latestRequestSequence,
          syncKeyHash: input.syncKeyHash,
          requestedContextGeneration: input.requestedContextGeneration,
        }),
      );
    }

    const sequence = ++this.latestRequestSequence;
    const contextKey = buildContextKey(this.context);
    const sentPosition = { ...input.position };
    const requestedContextGeneration = input.requestedContextGeneration;

    const promise = (async (): Promise<PositionSyncResult> => {
      try {
        const response = await input.publish(sentPosition);
        const ok = response.ok;
        const latestSequenceAtCompletion = this.latestRequestSequence;

        if (sequence < this.latestRequestSequence) {
          return {
            ok,
            outcome: "superseded",
            forceRequested: input.forceRequested,
            requestSequence: sequence,
            latestSequenceAtCompletion,
            reuseWindowMs: LIVE_GAME_INTERACTION_POSITION_REUSE_MS,
            reuseDistancePx: LIVE_GAME_INTERACTION_POSITION_REUSE_DISTANCE_PX,
            syncKeyHash: input.syncKeyHash,
            abortReason: null,
            ...this.lifecycleFields(requestedContextGeneration),
            requestReachedFetch: true,
          };
        }

        if (this.disposed) {
          return this.rejectResult({
            forceRequested: input.forceRequested,
            outcome: "disposed",
            abortReason: "permanent_unmount",
            requestSequence: sequence,
            syncKeyHash: input.syncKeyHash,
            requestedContextGeneration,
            requestReachedFetch: true,
          });
        }

        if (!this.context || buildContextKey(this.context) !== contextKey) {
          return this.rejectResult({
            forceRequested: input.forceRequested,
            outcome: "aborted_context_change",
            abortReason: "context_generation_mismatch",
            requestSequence: sequence,
            syncKeyHash: input.syncKeyHash,
            requestedContextGeneration,
            requestReachedFetch: true,
          });
        }

        if (ok) {
          this.latestAppliedSequence = sequence;
          this.lastSuccess = {
            position: sentPosition,
            syncedAt: input.now,
            sequence,
            contextKey,
          };
        }

        return {
          ok,
          outcome:
            !ok ? "failed"
            : input.forceRequested ? "forced_started"
            : "started",
          forceRequested: input.forceRequested,
          requestSequence: sequence,
          latestSequenceAtCompletion: this.latestRequestSequence,
          reuseWindowMs: LIVE_GAME_INTERACTION_POSITION_REUSE_MS,
          reuseDistancePx: LIVE_GAME_INTERACTION_POSITION_REUSE_DISTANCE_PX,
          syncKeyHash: input.syncKeyHash,
          abortReason: null,
          ...this.lifecycleFields(requestedContextGeneration),
          requestReachedFetch: true,
        };
      } catch {
        if (sequence < this.latestRequestSequence) {
          return {
            ok: false,
            outcome: "superseded",
            forceRequested: input.forceRequested,
            requestSequence: sequence,
            latestSequenceAtCompletion: this.latestRequestSequence,
            reuseWindowMs: LIVE_GAME_INTERACTION_POSITION_REUSE_MS,
            reuseDistancePx: LIVE_GAME_INTERACTION_POSITION_REUSE_DISTANCE_PX,
            syncKeyHash: input.syncKeyHash,
            abortReason: null,
            ...this.lifecycleFields(requestedContextGeneration),
            requestReachedFetch: true,
          };
        }
        return this.rejectResult({
          forceRequested: input.forceRequested,
          outcome: "failed",
          abortReason: null,
          requestSequence: sequence,
          syncKeyHash: input.syncKeyHash,
          requestedContextGeneration,
          requestReachedFetch: true,
        });
      } finally {
        if (this.inFlight?.sequence === sequence) {
          this.inFlight = null;
        }
      }
    })();

    void promise.catch(() => undefined);

    this.inFlight = {
      syncKey: input.syncKey,
      position: sentPosition,
      sequence,
      startedAt: input.now,
      forceRequested: input.forceRequested,
      consumerCount: 1,
      promise,
    };

    return promise;
  }

  private lifecycleFields(requestedContextGeneration?: number) {
    return {
      controllerInstanceIdHash: this.instanceIdHash,
      controllerContextGeneration: this.context?.sessionGeneration ?? 0,
      requestedContextGeneration: requestedContextGeneration ?? this.context?.sessionGeneration ?? 0,
      hasRoomId: Boolean(this.context?.roomId),
      hasPlayerId: Boolean(this.context?.playerId),
      isDisposed: this.disposed,
      contextReady: this.context != null && !this.disposed,
    };
  }

  private rejectResult(input: {
    forceRequested: boolean;
    outcome: PositionSyncOutcome;
    abortReason: PositionSyncAbortReason;
    requestSequence: number;
    syncKeyHash?: string | null;
    requestedContextGeneration?: number;
    requestReachedFetch?: boolean;
  }): PositionSyncResult {
    return {
      ok: false,
      outcome: input.outcome,
      forceRequested: input.forceRequested,
      requestSequence: input.requestSequence,
      latestSequenceAtCompletion: this.latestRequestSequence,
      reuseWindowMs: LIVE_GAME_INTERACTION_POSITION_REUSE_MS,
      reuseDistancePx: LIVE_GAME_INTERACTION_POSITION_REUSE_DISTANCE_PX,
      syncKeyHash: input.syncKeyHash ?? null,
      abortReason: input.abortReason,
      ...this.lifecycleFields(input.requestedContextGeneration),
      requestReachedFetch: input.requestReachedFetch ?? false,
    };
  }
}
