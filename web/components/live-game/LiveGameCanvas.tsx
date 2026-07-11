"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelf } from "@liveblocks/react/suspense";
import { LiveGameCraftModal } from "@/components/live-game/LiveGameCraftModal";
import {
  LiveGameMapStage,
  useLiveGameMapStage,
} from "@/components/live-game/LiveGameMapStage";
import {
  LiveGameConnectionBanner,
} from "@/components/live-game/LiveGameDebugPanel";
import { LiveGameMcChallengeModal } from "@/components/live-game/LiveGameMcChallengeModal";
import { LiveGameFinalCountdownOverlay } from "@/components/live-game/LiveGameFinalCountdownOverlay";
import { LiveGameHostEndSessionModal } from "@/components/live-game/LiveGameHostEndSessionModal";
import { LiveGameHostPlayHud } from "@/components/live-game/LiveGameHostPlayHud";
import { LiveGameSessionTimerChip } from "@/components/live-game/LiveGameSessionTimerChip";
import { LiveGameSessionTimerFlash } from "@/components/live-game/LiveGameSessionTimerFlash";
import { LiveGameVictoryOverlay } from "@/components/live-game/LiveGameVictoryOverlay";
import {
  LiveGameInteractPrompt,
  LiveGameTeamHud,
} from "@/components/live-game/LiveGameWoodHud";
import type { LiveGameSessionContext } from "@/lib/live-game/liveblocks/identity";
import { toRoomId } from "@/lib/live-game/liveblocks/room-id";
import { findNearestInteractable } from "@/lib/live-game/engine/interact";
import { LIVE_GAME_CHALLENGE_PREFETCH_DEBOUNCE_MS } from "@/lib/live-game/challenge-prefetch";
import { useLiveGameCraftChallenge } from "@/lib/live-game/hooks/useLiveGameCraftChallenge";
import { useLiveGameAvatar } from "@/lib/live-game/hooks/useLiveGameAvatar";
import { useLiveGameFlagTouch } from "@/lib/live-game/hooks/useLiveGameFlagTouch";
import {
  useLiveGameBridgeCrafted,
  useLiveGameResourceNodes,
  useLiveGameResourcePool,
  useLiveGameRiverCrossingUnlocked,
} from "@/lib/live-game/hooks/useLiveGameGameplay";
import { useLiveGameWoodChallenge } from "@/lib/live-game/hooks/useLiveGameWoodChallenge";
import { useLiveGameAutoTimeout } from "@/lib/live-game/hooks/useLiveGameAutoTimeout";
import { useLiveGameSessionTimer } from "@/lib/live-game/hooks/useLiveGameSessionTimer";
import { sumTreesChopped } from "@/lib/live-game/hooks/useLiveGameVictoryStats";
import { useLiveGameLobby } from "@/lib/live-game/liveblocks/use-live-game-lobby";
import type { LiveGameResourceNodeState } from "@/lib/live-game/liveblocks/config";
import { getMapForMode } from "@/lib/live-game/modes";
import { ENGLISH_CRAFT_MODE } from "@/lib/live-game/modes/english-craft/config";
import {
  ENGLISH_CRAFT_CRAFT_BENCH_V1,
  ENGLISH_CRAFT_WOOD_TREES_V1,
} from "@/lib/live-game/modes/english-craft/map-objects-v1";
import { getEnglishCraftCollisionRects } from "@/lib/live-game/modes/english-craft/map-v1";
import {
  ENGLISH_CRAFT_WOOD_GOAL,
  isEnglishCraftResourceNodeInteractable,
} from "@/lib/live-game/modes/english-craft/gameplay-v1";

type Props = {
  context: LiveGameSessionContext;
};

function isTreeInteractable(node: LiveGameResourceNodeState | undefined, now = Date.now()) {
  if (!node) return true;
  return isEnglishCraftResourceNodeInteractable(node, now);
}

export function LiveGameCanvas({ context }: Props) {
  const self = useSelf();
  const { players, selfEntry, session, isHost, returnToLobby, endRoundAndReturnToLobby } =
    useLiveGameLobby();
  const [endSessionModalOpen, setEndSessionModalOpen] = useState(false);
  const { avatarId } = useLiveGameAvatar(context);
  const baseMap = getMapForMode(session.mapId, session.modeId);
  const wood = useLiveGameResourcePool();
  const resourceNodes = useLiveGameResourceNodes();
  const bridgeCrafted = useLiveGameBridgeCrafted();
  const riverCrossingUnlocked = useLiveGameRiverCrossingUnlocked();
  const roomId = toRoomId(context.sessionId);
  const playerId = self.id;

  const spawnIndex = selfEntry ?
    Math.max(0, players.findIndex((entry) => entry.id === selfEntry.id))
  : 0;

  const woodChallenge = useLiveGameWoodChallenge({
    roomId,
    playerId,
  });
  const craftChallenge = useLiveGameCraftChallenge({
    roomId,
    playerId,
  });

  const canCraft = wood >= ENGLISH_CRAFT_WOOD_GOAL && !bridgeCrafted;
  const isPlaying = session.phase === "playing";
  const isCompleted = session.phase === "completed";
  const sessionTimer = useLiveGameSessionTimer({
    endsAt: session.endsAt,
    enabled: isPlaying,
    showStudentFlashes: !isHost,
  });
  const anyChallengeOpen = woodChallenge.isOpen || craftChallenge.isOpen;
  const movementEnabled = isPlaying && !anyChallengeOpen && !endSessionModalOpen;

  useLiveGameAutoTimeout({
    enabled: isPlaying,
    isExpired: sessionTimer?.isExpired ?? false,
    hasTimedSession: session.endsAt != null,
    onTimeout: endRoundAndReturnToLobby,
  });

  const map = useMemo(
    () => ({
      ...baseMap,
      collisionRects: getEnglishCraftCollisionRects(riverCrossingUnlocked),
    }),
    [baseMap, riverCrossingUnlocked],
  );

  const stage = useLiveGameMapStage({
    map,
    spawnIndex,
    avatarId,
    movementEnabled,
    players,
    visualMode: "playing",
    resourceNodes,
    bridgeCrafted,
  });

  const { getPosition, sampledPosition, now } = stage;

  useLiveGameFlagTouch({
    roomId,
    playerId,
    playerX: sampledPosition.x,
    playerY: sampledPosition.y,
    enabled: isPlaying && bridgeCrafted && riverCrossingUnlocked,
  });

  const interactableTrees = useMemo(
    () =>
      ENGLISH_CRAFT_WOOD_TREES_V1.filter((tree) =>
        isTreeInteractable(resourceNodes[tree.id], now),
      ),
    [now, resourceNodes],
  );

  const craftBenchTarget = useMemo(() => {
    if (!canCraft) return null;
    return findNearestInteractable(
      sampledPosition.x,
      sampledPosition.y,
      [ENGLISH_CRAFT_CRAFT_BENCH_V1],
    );
  }, [canCraft, sampledPosition.x, sampledPosition.y]);

  const treeTarget = useMemo(
    () =>
      findNearestInteractable(
        sampledPosition.x,
        sampledPosition.y,
        interactableTrees,
      ),
    [interactableTrees, sampledPosition.x, sampledPosition.y],
  );

  const handleInteract = useCallback(() => {
    if (woodChallenge.isOpen || craftChallenge.isOpen) {
      return;
    }

    const position = getPosition();

    if (canCraft) {
      const bench = findNearestInteractable(position.x, position.y, [ENGLISH_CRAFT_CRAFT_BENCH_V1]);
      if (bench) {
        void craftChallenge.beginChallenge();
        return;
      }
    }

    const tree = findNearestInteractable(position.x, position.y, interactableTrees);
    if (!tree) return;
    void woodChallenge.beginChallenge(tree, resourceNodes[tree.id]?.cooldownEndsAt ?? null);
  }, [
    canCraft,
    craftChallenge,
    getPosition,
    interactableTrees,
    resourceNodes,
    woodChallenge,
  ]);

  useEffect(() => {
    if (!isPlaying || anyChallengeOpen || woodChallenge.isSubmitting || craftChallenge.isSubmitting) {
      woodChallenge.cancelPrefetch();
      craftChallenge.cancelPrefetch();
      return;
    }

    if (canCraft && craftBenchTarget) {
      woodChallenge.cancelPrefetch();
      const timeout = window.setTimeout(() => {
        void craftChallenge.prefetchChallenge();
      }, LIVE_GAME_CHALLENGE_PREFETCH_DEBOUNCE_MS);
      return () => {
        window.clearTimeout(timeout);
        craftChallenge.cancelPrefetch();
      };
    }

    if (treeTarget) {
      craftChallenge.cancelPrefetch();
      const cooldownEndsAt = resourceNodes[treeTarget.id]?.cooldownEndsAt ?? null;
      const timeout = window.setTimeout(() => {
        void woodChallenge.prefetchForNode(treeTarget.id, cooldownEndsAt);
      }, LIVE_GAME_CHALLENGE_PREFETCH_DEBOUNCE_MS);
      return () => {
        window.clearTimeout(timeout);
        woodChallenge.cancelPrefetch();
      };
    }

    woodChallenge.cancelPrefetch();
    craftChallenge.cancelPrefetch();
  }, [
    anyChallengeOpen,
    canCraft,
    craftBenchTarget,
    craftChallenge,
    isPlaying,
    resourceNodes,
    treeTarget,
    woodChallenge,
  ]);

  useEffect(() => {
    if (!canCraft) {
      craftChallenge.clearPrefetchCache();
    }
  }, [canCraft, craftChallenge]);

  useEffect(() => {
    for (const tree of ENGLISH_CRAFT_WOOD_TREES_V1) {
      const nodeState = resourceNodes[tree.id];
      if (nodeState && !isTreeInteractable(nodeState, now)) {
        woodChallenge.clearPrefetchCache(tree.id);
      }
    }
  }, [now, resourceNodes, woodChallenge]);

  useEffect(() => {
    if (!isPlaying || anyChallengeOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "e" && event.key !== "E") return;
      event.preventDefault();
      handleInteract();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [anyChallengeOpen, handleInteract, isPlaying]);

  const subtitle =
    isCompleted ?
      "Team victory!"
    : bridgeCrafted ?
      "Bridge built — cross the river and reach the flag!"
    : canCraft ?
      "Craft the bridge at the bench — E or Interact"
    : "Chop trees for team wood — E or Interact";

  const hasInteractTarget = craftBenchTarget != null || treeTarget != null;

  const interactLabel =
    craftBenchTarget ? "Craft bridge"
    : treeTarget ? `Chop ${treeTarget.label}`
    : bridgeCrafted ? "Reach the flag!"
    : canCraft ? "Craft bridge"
    : "Chop tree";

  const completedByName = useMemo(() => {
    const completedPlayerId = session.completedByPlayerId;
    if (!completedPlayerId) return null;
    return players.find((entry) => entry.id === completedPlayerId)?.player.name ?? null;
  }, [players, session.completedByPlayerId]);

  const treesChopped = useMemo(() => sumTreesChopped(resourceNodes), [resourceNodes]);

  const handlePlayAgain = useCallback(() => {
    returnToLobby();
  }, [returnToLobby]);

  const timerUrgent =
    sessionTimer?.alertPhase === "thirty_sec" || sessionTimer?.alertPhase === "final_five";

  return (
    <>
      <LiveGameMapStage
        map={map}
        stage={stage}
        displayName={context.displayName}
        avatarId={avatarId}
        showDpad={!isCompleted}
        footer={
          !isCompleted ?
            <LiveGameInteractPrompt
              label={interactLabel}
              disabled={(!hasInteractTarget && !bridgeCrafted) || !isPlaying}
              onInteract={handleInteract}
            />
          : null
        }
      >
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col">
          <header className="pointer-events-auto bg-gradient-to-b from-black/70 via-black/40 to-transparent px-3 pb-8 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="truncate text-base font-extrabold text-white sm:text-lg">
                  {ENGLISH_CRAFT_MODE.title}
                </h1>
                <p className="text-xs font-semibold text-white/80 sm:text-sm">{subtitle}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {isHost ?
                  <LiveGameHostPlayHud
                    showTimer={sessionTimer != null}
                    timerLabel={sessionTimer?.label ?? ""}
                    timerUrgent={timerUrgent}
                    onEndSessionClick={() => setEndSessionModalOpen(true)}
                    endDisabled={!isPlaying}
                  />
                : sessionTimer ?
                  <LiveGameSessionTimerChip label={sessionTimer.label} urgent={timerUrgent} />
                : null}
                <LiveGameTeamHud wood={wood} />
              </div>
            </div>
            <LiveGameConnectionBanner className="mt-2 rounded-lg border-2 border-amber-300/80 bg-amber-950/90 px-3 py-2 text-sm font-semibold text-amber-100 backdrop-blur-sm" />
          </header>
        </div>
      </LiveGameMapStage>

      {!isHost && sessionTimer ?
        <>
          <LiveGameSessionTimerFlash flash={sessionTimer.activeFlash} />
          <LiveGameFinalCountdownOverlay digit={sessionTimer.finalCountdownDigit} />
        </>
      : null}

      <LiveGameMcChallengeModal
        open={woodChallenge.isOpen}
        question={woodChallenge.activeChallenge?.question ?? null}
        tokenStatus={woodChallenge.tokenStatus}
        isSubmitting={woodChallenge.isSubmitting}
        feedback={woodChallenge.lastResult}
        error={woodChallenge.error}
        onSubmit={(answer) => void woodChallenge.submitAnswer(answer)}
        onClose={woodChallenge.closeChallenge}
      />

      <LiveGameCraftModal
        open={craftChallenge.isOpen}
        question={craftChallenge.activeChallenge?.question ?? null}
        tokenStatus={craftChallenge.tokenStatus}
        isSubmitting={craftChallenge.isSubmitting}
        feedback={craftChallenge.lastResult}
        error={craftChallenge.error}
        onSubmit={(order) => void craftChallenge.submitAnswer(order)}
        onClose={craftChallenge.closeChallenge}
      />

      {isCompleted ?
        <LiveGameVictoryOverlay
          completedByName={completedByName}
          treesChopped={treesChopped}
          isHost={isHost}
          onPlayAgain={handlePlayAgain}
        />
      : null}

      <LiveGameHostEndSessionModal
        open={endSessionModalOpen}
        onClose={() => setEndSessionModalOpen(false)}
        onConfirm={() => {
          endRoundAndReturnToLobby("host_ended_early");
          setEndSessionModalOpen(false);
        }}
      />
    </>
  );
}
