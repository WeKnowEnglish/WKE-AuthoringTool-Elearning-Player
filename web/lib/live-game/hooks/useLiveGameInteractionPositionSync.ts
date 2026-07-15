"use client";

import { useCallback, useEffect, useRef } from "react";
import { diagnosticFetch, recordLiveGameDiagnostic } from "@/lib/live-game/diagnostics/client";
import type { LiveGameDiagnosticDetail } from "@/lib/live-game/diagnostics/types";
import {
  InteractionPositionSyncController,
  isPositionSyncContextReady,
  type PositionSyncAbortReason,
  type PositionSyncResult,
} from "@/lib/live-game/interaction-position-sync-controller";

type Options = {
  roomId: string;
  playerId: string;
};

/**
 * Owns a single InteractionPositionSyncController for the canvas lifetime.
 *
 * Critical lifecycle rules:
 * - Context updates invalidate cache and keep the controller usable.
 * - dispose() runs only on permanent unmount of this hook.
 * - If Strict Mode / remount cleanup disposes an instance while the hook lives,
 *   the next ensureController() replaces it and re-applies context.
 * - Context is applied synchronously when room/player are ready so sync never
 *   races against a not-yet-run effect.
 */
export function useLiveGameInteractionPositionSync({ roomId, playerId }: Options) {
  const controllerRef = useRef<InteractionPositionSyncController>(
    new InteractionPositionSyncController(),
  );
  const sessionGenerationRef = useRef(0);
  const appliedContextKeyRef = useRef<string | null>(null);

  const ensureController = useCallback(() => {
    const current = controllerRef.current;
    if (!current.isDisposed()) return current;
    const replacement = new InteractionPositionSyncController();
    controllerRef.current = replacement;
    appliedContextKeyRef.current = null;
    return replacement;
  }, []);

  const ensureContext = useCallback(() => {
    const readiness = isPositionSyncContextReady({
      roomId,
      playerId,
      sessionGeneration: Math.max(1, sessionGenerationRef.current || 1),
    });
    if (!readiness.ready) {
      return { ready: false as const, reason: readiness.reason };
    }

    const controller = ensureController();
    const contextKey = `${readiness.context.roomId}|${readiness.context.playerId}`;
    if (appliedContextKeyRef.current !== contextKey) {
      sessionGenerationRef.current += 1;
      appliedContextKeyRef.current = contextKey;
    } else if (sessionGenerationRef.current < 1) {
      sessionGenerationRef.current = 1;
    }

    const applied = controller.setContext({
      roomId: readiness.context.roomId,
      playerId: readiness.context.playerId,
      sessionGeneration: sessionGenerationRef.current,
    });

    if (!applied || controller.isDisposed()) {
      const replacement = new InteractionPositionSyncController();
      controllerRef.current = replacement;
      replacement.setContext({
        roomId: readiness.context.roomId,
        playerId: readiness.context.playerId,
        sessionGeneration: sessionGenerationRef.current,
      });
      return { ready: true as const, controller: replacement };
    }

    return { ready: true as const, controller };
  }, [ensureController, playerId, roomId]);

  useEffect(() => {
    // Capture the instance tied to this effect cycle. Strict Mode re-runs will
    // dispose this exact instance; ensureContext() then creates a fresh one.
    const controllerAtMount = ensureController();
    ensureContext();
    return () => {
      controllerAtMount.dispose("permanent_unmount");
      if (controllerRef.current === controllerAtMount) {
        // Leave the disposed instance in the ref; ensureController() replaces it
        // on the next ensure/sync. Never revive a disposed instance via setContext.
        appliedContextKeyRef.current = null;
      }
    };
  }, [ensureContext, ensureController]);

  const publishPositionAt = useCallback(
    async (position: { x: number; y: number }, detail: LiveGameDiagnosticDetail) => {
      return diagnosticFetch(
        "/api/live-game/position",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, x: position.x, y: position.y }),
        },
        {
          phase: "gameplay",
          name: "interaction_position_sync",
          detail,
        },
      );
    },
    [roomId],
  );

  const syncInteractionPosition = useCallback(
    (getPosition: () => { x: number; y: number }, force = false) => {
      const readiness = ensureContext();
      if (!readiness.ready) {
        const result = notReadyResult(force, readiness.reason, roomId, playerId);
        recordPositionSyncOutcome(result);
        return Promise.resolve(result);
      }

      const position = getPosition();
      return readiness.controller
        .sync({
          position,
          readPosition: getPosition,
          force,
          publish: (sentPosition) =>
            publishPositionAt(sentPosition, {
              forceRequested: force,
              requestReachedFetch: true,
              controllerInstanceIdHash: readiness.controller.getInstanceIdHash(),
            }),
        })
        .then((result) => {
          recordPositionSyncOutcome(result);
          return result;
        });
    },
    [ensureContext, playerId, publishPositionAt, roomId],
  );

  const publishCurrentPosition = useCallback(
    (getPosition: () => { x: number; y: number }) =>
      publishPositionAt(getPosition(), {}),
    [publishPositionAt],
  );

  return {
    syncInteractionPosition,
    publishCurrentPosition,
  };
}

function notReadyResult(
  forceRequested: boolean,
  reason: PositionSyncAbortReason,
  roomId: string,
  playerId: string,
): PositionSyncResult {
  return {
    ok: false,
    outcome: "not_ready",
    forceRequested,
    requestSequence: 0,
    latestSequenceAtCompletion: 0,
    reuseWindowMs: 1_500,
    reuseDistancePx: 12,
    syncKeyHash: null,
    abortReason: reason,
    hasRoomId: Boolean(roomId),
    hasPlayerId: Boolean(playerId),
    isDisposed: false,
    contextReady: false,
    requestReachedFetch: false,
  };
}

function recordPositionSyncOutcome(result: PositionSyncResult) {
  recordLiveGameDiagnostic("gameplay", "interaction_position_sync", {
    syncOutcome: result.outcome,
    forceRequested: result.forceRequested,
    requestSequence: result.requestSequence,
    latestSequenceAtCompletion: result.latestSequenceAtCompletion,
    positionAgeMs: result.positionAgeMs ?? null,
    movementDeltaPx: result.movementDeltaPx ?? null,
    reuseWindowMs: result.reuseWindowMs,
    reuseDistancePx: result.reuseDistancePx,
    inFlightAgeMs: result.inFlightAgeMs ?? null,
    sharedConsumerCount: result.sharedConsumerCount ?? null,
    syncKeyHash: result.syncKeyHash ?? null,
    abortReason: result.abortReason ?? null,
    controllerInstanceIdHash: result.controllerInstanceIdHash ?? null,
    controllerContextGeneration: result.controllerContextGeneration ?? null,
    requestedContextGeneration: result.requestedContextGeneration ?? null,
    hasRoomId: result.hasRoomId ?? null,
    hasPlayerId: result.hasPlayerId ?? null,
    isDisposed: result.isDisposed ?? null,
    contextReady: result.contextReady ?? null,
    requestReachedFetch: result.requestReachedFetch ?? null,
  });
}
