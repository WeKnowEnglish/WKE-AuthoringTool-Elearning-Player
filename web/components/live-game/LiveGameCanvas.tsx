"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LiveGameCraftModal } from "@/components/live-game/LiveGameCraftModal";
import { LiveGameCraftRecipePicker } from "@/components/live-game/LiveGameCraftRecipePicker";
import {
  LiveGameMapStage,
  useLiveGameMapStage,
} from "@/components/live-game/LiveGameMapStage";
import {
  LiveGameConnectionBanner,
} from "@/components/live-game/LiveGameDebugPanel";
import { LiveGameMcChallengeModal } from "@/components/live-game/LiveGameMcChallengeModal";
import { LiveGameSpellChallengeModal } from "@/components/live-game/LiveGameSpellChallengeModal";
import { LiveGameFinalCountdownOverlay } from "@/components/live-game/LiveGameFinalCountdownOverlay";
import { LiveGameHostEndSessionModal } from "@/components/live-game/LiveGameHostEndSessionModal";
import { LiveGameHostPlayHud } from "@/components/live-game/LiveGameHostPlayHud";
import { LiveGameSessionTimerChip } from "@/components/live-game/LiveGameSessionTimerChip";
import { LiveGameSessionTimerFlash } from "@/components/live-game/LiveGameSessionTimerFlash";
import { LiveGameVictoryOverlay } from "@/components/live-game/LiveGameVictoryOverlay";
import {
  LiveGameInteractPrompt,
  LiveGameTeamResourceHud,
} from "@/components/live-game/LiveGameWoodHud";
import type { LiveGameSessionContext } from "@/lib/live-game/liveblocks/identity";
import { toRoomId } from "@/lib/live-game/liveblocks/room-id";
import { findNearestInteractable } from "@/lib/live-game/engine/interact";
import { LIVE_GAME_CHALLENGE_PREFETCH_DEBOUNCE_MS } from "@/lib/live-game/challenge-prefetch";
import { useLiveGameCraftChallenge } from "@/lib/live-game/hooks/useLiveGameCraftChallenge";
import { useLiveGameDepositChallenge } from "@/lib/live-game/hooks/useLiveGameDepositChallenge";
import { useLiveGameAvatar } from "@/lib/live-game/hooks/useLiveGameAvatar";
import { useLiveGameFlagTouch } from "@/lib/live-game/hooks/useLiveGameFlagTouch";
import {
  useLiveGameCraftedItems,
  useLiveGameResourceNodes,
  useLiveGameResourcePool,
  useLiveGameRiverCrossingUnlocked,
  useLiveGameSelfCarry,
} from "@/lib/live-game/hooks/useLiveGameGameplay";
import { useLiveGameHarvestChallenge } from "@/lib/live-game/hooks/useLiveGameHarvestChallenge";
import { useLiveGameAutoTimeout } from "@/lib/live-game/hooks/useLiveGameAutoTimeout";
import { useLiveGameSessionTimer } from "@/lib/live-game/hooks/useLiveGameSessionTimer";
import { buildVictoryResourceStats } from "@/lib/live-game/hooks/useLiveGameVictoryStats";
import { useLiveGameLobby } from "@/lib/live-game/liveblocks/use-live-game-lobby";
import type { LiveGameResourceNodeState } from "@/lib/live-game/liveblocks/config";
import { getMapForMode } from "@/lib/live-game/modes";
import { ENGLISH_CRAFT_MODE } from "@/lib/live-game/modes/english-craft/config";
import {
  depositInteractLabel,
  ENGLISH_CRAFT_BOAT_HAMMER_GOAL,
  harvestInteractLabel,
  isEnglishCraftResourceNodeInteractable,
} from "@/lib/live-game/modes/english-craft/gameplay-v1";
import {
  canAffordRecipePoolCost,
  ENGLISH_CRAFT_BUILD_BENCH_RECIPE,
  ENGLISH_CRAFT_CRAFT_BOAT_RECIPE,
  formatRecipeCostSummary,
  formatRecipeFullCostSummary,
  getDefaultBenchRecipe,
  type CraftRecipe,
  type CraftRecipeId,
} from "@/lib/live-game/modes/english-craft/craft-recipes-v1";
import {
  ENGLISH_CRAFT_CRAFT_BENCH_V1,
  ENGLISH_CRAFT_RESOURCE_NODES_V1,
  ENGLISH_CRAFT_STORAGE_BY_TYPE,
  toStorageInteractTarget,
} from "@/lib/live-game/modes/english-craft/map-objects-v1";
import { getEnglishCraftCollisionRects } from "@/lib/live-game/modes/english-craft/map-v1";

type Props = {
  context: LiveGameSessionContext;
};

function isNodeInteractable(node: LiveGameResourceNodeState | undefined, now = Date.now()) {
  if (!node) return true;
  return isEnglishCraftResourceNodeInteractable(node, now);
}

export function LiveGameCanvas({ context }: Props) {
  const { players, selfEntry, session, isHost, returnToLobby, endRoundAndReturnToLobby } =
    useLiveGameLobby();
  const [endSessionModalOpen, setEndSessionModalOpen] = useState(false);
  const [recipePickerOpen, setRecipePickerOpen] = useState(false);
  const { avatarId } = useLiveGameAvatar(context);
  const baseMap = getMapForMode(session.mapId, session.modeId);
  const pool = useLiveGameResourcePool();
  const resourceNodes = useLiveGameResourceNodes();
  const selfCarry = useLiveGameSelfCarry();
  const craftedItems = useLiveGameCraftedItems();
  const benchBuilt = craftedItems.benchBuilt;
  const boatBuilt = craftedItems.boat;
  const riverCrossingUnlocked = useLiveGameRiverCrossingUnlocked();
  const roomId = toRoomId(context.sessionId);
  const buildBenchRecipe = ENGLISH_CRAFT_BUILD_BENCH_RECIPE;
  const buildBenchCostSummary = formatRecipeCostSummary(buildBenchRecipe);

  const gameplaySnapshot = useMemo(
    () => ({
      session: { phase: session.phase },
      resourcePool: pool,
      craftedItems,
    }),
    [craftedItems, pool, session.phase],
  );

  const spawnIndex = selfEntry ?
    Math.max(0, players.findIndex((entry) => entry.id === selfEntry.id))
  : 0;

  const harvestChallenge = useLiveGameHarvestChallenge({ roomId });
  const depositChallenge = useLiveGameDepositChallenge({ roomId });
  const craftChallenge = useLiveGameCraftChallenge({ roomId });

  const isCarrying = selfCarry != null;
  const canBuildBench =
    !isCarrying &&
    !benchBuilt &&
    canAffordRecipePoolCost(pool, buildBenchRecipe);
  const canCraftAtBench = !isCarrying && benchBuilt && !boatBuilt;
  const isPlaying = session.phase === "playing";
  const isCompleted = session.phase === "completed";
  const sessionTimer = useLiveGameSessionTimer({
    endsAt: session.endsAt,
    enabled: isPlaying,
    showStudentFlashes: !isHost,
  });
  const anyChallengeOpen =
    harvestChallenge.isOpen ||
    depositChallenge.isOpen ||
    craftChallenge.isOpen ||
    recipePickerOpen;
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
    craftedItems,
    resourcePool: pool,
  });

  const { getPosition, sampledPosition, now } = stage;

  const publishPosition = useCallback(() => {
    const position = getPosition();
    return fetch("/api/live-game/position", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, x: position.x, y: position.y }),
    });
  }, [getPosition, roomId]);

  useLiveGameFlagTouch({
    roomId,
    playerX: sampledPosition.x,
    playerY: sampledPosition.y,
    enabled: false,
  });

  const interactableNodes = useMemo(
    () =>
      ENGLISH_CRAFT_RESOURCE_NODES_V1.filter((node) =>
        isNodeInteractable(resourceNodes[node.id], now),
      ),
    [now, resourceNodes],
  );

  const carryStorageDef = useMemo(
    () => (selfCarry ? ENGLISH_CRAFT_STORAGE_BY_TYPE[selfCarry.resourceType] : null),
    [selfCarry],
  );

  const depositTarget = useMemo(() => {
    if (!carryStorageDef) return null;
    return findNearestInteractable(
      sampledPosition.x,
      sampledPosition.y,
      [toStorageInteractTarget(carryStorageDef)],
    );
  }, [carryStorageDef, sampledPosition.x, sampledPosition.y]);

  const nearBench = useMemo(
    () =>
      findNearestInteractable(
        sampledPosition.x,
        sampledPosition.y,
        [ENGLISH_CRAFT_CRAFT_BENCH_V1],
      ),
    [sampledPosition.x, sampledPosition.y],
  );

  const craftBenchTarget = useMemo(() => {
    if (!nearBench) return null;
    if (canBuildBench || canCraftAtBench) return nearBench;
    return null;
  }, [canBuildBench, canCraftAtBench, nearBench]);

  const harvestTarget = useMemo(() => {
    if (isCarrying) return null;
    return findNearestInteractable(
      sampledPosition.x,
      sampledPosition.y,
      interactableNodes,
    );
  }, [interactableNodes, isCarrying, sampledPosition.x, sampledPosition.y]);

  const defaultBenchRecipeId = useMemo(
    () => getDefaultBenchRecipe(gameplaySnapshot),
    [gameplaySnapshot],
  );

  const handleRecipeSelect = useCallback(
    (recipeId: CraftRecipeId, recipe: CraftRecipe) => {
      setRecipePickerOpen(false);
      craftChallenge.clearPrefetchCache();
      void craftChallenge.beginChallenge(
        recipeId,
        recipe.label,
        formatRecipeFullCostSummary(recipe),
      );
    },
    [craftChallenge],
  );

  const handleInteract = useCallback(async () => {
    if (
      harvestChallenge.isOpen ||
      depositChallenge.isOpen ||
      craftChallenge.isOpen ||
      recipePickerOpen
    ) {
      return;
    }

    const positionResponse = await publishPosition();
    if (!positionResponse.ok) return;

    const position = getPosition();

    if (isCarrying && carryStorageDef) {
      const storage = findNearestInteractable(position.x, position.y, [
        toStorageInteractTarget(carryStorageDef),
      ]);
      if (storage) {
        void depositChallenge.beginChallenge(carryStorageDef);
        return;
      }
    }

    if (canBuildBench) {
      const bench = findNearestInteractable(position.x, position.y, [ENGLISH_CRAFT_CRAFT_BENCH_V1]);
      if (bench) {
        void craftChallenge.beginChallenge(
          "build_bench",
          buildBenchRecipe.label,
          buildBenchCostSummary,
        );
        return;
      }
    }

    if (canCraftAtBench) {
      const bench = findNearestInteractable(position.x, position.y, [ENGLISH_CRAFT_CRAFT_BENCH_V1]);
      if (bench) {
        setRecipePickerOpen(true);
        return;
      }
    }

    const node = findNearestInteractable(position.x, position.y, interactableNodes);
    if (!node) return;
    void harvestChallenge.beginChallenge(node, resourceNodes[node.id]?.cooldownEndsAt ?? null);
  }, [
    buildBenchCostSummary,
    buildBenchRecipe.label,
    canBuildBench,
    canCraftAtBench,
    carryStorageDef,
    craftChallenge,
    depositChallenge,
    getPosition,
    harvestChallenge,
    interactableNodes,
    isCarrying,
    publishPosition,
    recipePickerOpen,
    resourceNodes,
  ]);

  useEffect(() => {
    if (
      !isPlaying ||
      anyChallengeOpen ||
      harvestChallenge.isSubmitting ||
      depositChallenge.isSubmitting ||
      craftChallenge.isSubmitting
    ) {
      harvestChallenge.cancelPrefetch();
      depositChallenge.cancelPrefetch();
      craftChallenge.cancelPrefetch();
      return;
    }

    if (isCarrying && depositTarget && carryStorageDef) {
      harvestChallenge.cancelPrefetch();
      craftChallenge.cancelPrefetch();
      void publishPosition();
      const timeout = window.setTimeout(() => {
        void depositChallenge.prefetchForStorage(carryStorageDef.id);
      }, LIVE_GAME_CHALLENGE_PREFETCH_DEBOUNCE_MS);
      return () => {
        window.clearTimeout(timeout);
        depositChallenge.cancelPrefetch();
      };
    }

    if (canBuildBench && craftBenchTarget) {
      harvestChallenge.cancelPrefetch();
      depositChallenge.cancelPrefetch();
      void publishPosition();
      const timeout = window.setTimeout(() => {
        void craftChallenge.prefetchChallenge("build_bench");
      }, LIVE_GAME_CHALLENGE_PREFETCH_DEBOUNCE_MS);
      return () => {
        window.clearTimeout(timeout);
        craftChallenge.cancelPrefetch();
      };
    }

    if (canCraftAtBench && craftBenchTarget && defaultBenchRecipeId) {
      harvestChallenge.cancelPrefetch();
      depositChallenge.cancelPrefetch();
      void publishPosition();
      const timeout = window.setTimeout(() => {
        void craftChallenge.prefetchChallenge(defaultBenchRecipeId);
      }, LIVE_GAME_CHALLENGE_PREFETCH_DEBOUNCE_MS);
      return () => {
        window.clearTimeout(timeout);
        craftChallenge.cancelPrefetch();
      };
    }

    if (harvestTarget) {
      depositChallenge.cancelPrefetch();
      craftChallenge.cancelPrefetch();
      void publishPosition();
      const cooldownEndsAt = resourceNodes[harvestTarget.id]?.cooldownEndsAt ?? null;
      const timeout = window.setTimeout(() => {
        void harvestChallenge.prefetchForNode(harvestTarget.id, cooldownEndsAt);
      }, LIVE_GAME_CHALLENGE_PREFETCH_DEBOUNCE_MS);
      return () => {
        window.clearTimeout(timeout);
        harvestChallenge.cancelPrefetch();
      };
    }

    harvestChallenge.cancelPrefetch();
    depositChallenge.cancelPrefetch();
    craftChallenge.cancelPrefetch();
  }, [
    anyChallengeOpen,
    canBuildBench,
    canCraftAtBench,
    carryStorageDef,
    craftBenchTarget,
    craftChallenge,
    defaultBenchRecipeId,
    depositChallenge,
    depositTarget,
    harvestChallenge,
    harvestTarget,
    isCarrying,
    isPlaying,
    publishPosition,
    resourceNodes,
  ]);

  useEffect(() => {
    if (!canBuildBench && !canCraftAtBench) {
      craftChallenge.clearPrefetchCache();
    }
  }, [canBuildBench, canCraftAtBench, craftChallenge]);

  useEffect(() => {
    if (!canCraftAtBench) {
      setRecipePickerOpen(false);
    }
  }, [canCraftAtBench]);

  useEffect(() => {
    for (const node of ENGLISH_CRAFT_RESOURCE_NODES_V1) {
      const nodeState = resourceNodes[node.id];
      if (nodeState && !isNodeInteractable(nodeState, now)) {
        harvestChallenge.clearPrefetchCache(node.id);
      }
    }
  }, [now, resourceNodes, harvestChallenge]);

  useEffect(() => {
    if (!isPlaying || anyChallengeOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "e" && event.key !== "E") return;
      event.preventDefault();
      void handleInteract();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [anyChallengeOpen, handleInteract, isPlaying]);

  const hammersNeeded = Math.max(0, ENGLISH_CRAFT_BOAT_HAMMER_GOAL - craftedItems.hammers);
  const canAffordBoatPool = canAffordRecipePoolCost(pool, ENGLISH_CRAFT_CRAFT_BOAT_RECIPE);

  const subtitle =
    isCompleted ?
      "Team victory!"
    : isCarrying ?
      "Take it to the matching storage and spell the word — E or Interact"
    : boatBuilt ?
      "Boat ready at the dock — boarding coming soon"
    : benchBuilt && craftBenchTarget ?
      "Craft hammers or the boat at the workbench"
    : benchBuilt && hammersNeeded > 0 ?
      `Craft hammers — need ${hammersNeeded} more for the boat`
    : benchBuilt && !canAffordBoatPool ?
      "Deposit wood and cotton to craft the boat"
    : canBuildBench ?
      "Build the workbench at the stump — E or Interact"
    : "Deposit wood and stone to build the workbench";

  const hasInteractTarget =
    depositTarget != null || craftBenchTarget != null || harvestTarget != null;

  const interactLabel =
    depositTarget && selfCarry ?
      depositInteractLabel(selfCarry.resourceType)
    : craftBenchTarget && canBuildBench ?
      "Build workbench"
    : craftBenchTarget && canCraftAtBench ?
      "Craft at workbench"
    : harvestTarget ?
      harvestInteractLabel(harvestTarget.resourceType, harvestTarget.label)
    : boatBuilt ?
      "Go to the dock"
    : isCarrying ?
      "Go to storage"
    : "Gather resource";

  const completedByName = useMemo(() => {
    const completedPlayerId = session.completedByPlayerId;
    if (!completedPlayerId) return null;
    return players.find((entry) => entry.id === completedPlayerId)?.player.name ?? null;
  }, [players, session.completedByPlayerId]);

  const resourceStats = useMemo(
    () => buildVictoryResourceStats(resourceNodes, pool),
    [pool, resourceNodes],
  );

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
              disabled={!hasInteractTarget || !isPlaying}
              onInteract={() => void handleInteract()}
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
                <LiveGameTeamResourceHud
                  pool={pool}
                  carriedResourceType={selfCarry?.resourceType}
                  hammers={craftedItems.hammers}
                  benchBuilt={craftedItems.benchBuilt}
                  boatBuilt={craftedItems.boat}
                />
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
        open={harvestChallenge.isOpen}
        question={harvestChallenge.activeChallenge?.question ?? null}
        resourceType={harvestChallenge.activeChallenge?.resourceType}
        tokenStatus={harvestChallenge.tokenStatus}
        isSubmitting={harvestChallenge.isSubmitting}
        feedback={harvestChallenge.lastResult}
        error={harvestChallenge.error}
        onSubmit={(answer) => void harvestChallenge.submitAnswer(answer)}
        onClose={harvestChallenge.closeChallenge}
      />

      <LiveGameSpellChallengeModal
        open={depositChallenge.isOpen}
        spell={depositChallenge.activeChallenge?.spell ?? null}
        resourceType={depositChallenge.activeChallenge?.resourceType}
        tokenStatus={depositChallenge.tokenStatus}
        isSubmitting={depositChallenge.isSubmitting}
        feedback={depositChallenge.lastResult}
        error={depositChallenge.error}
        onSubmit={(spelling) => void depositChallenge.submitAnswer(spelling)}
        onClose={depositChallenge.closeChallenge}
      />

      <LiveGameCraftRecipePicker
        open={recipePickerOpen}
        pool={pool}
        craftedItems={craftedItems}
        onSelect={handleRecipeSelect}
        onClose={() => setRecipePickerOpen(false)}
      />

      <LiveGameCraftModal
        open={craftChallenge.isOpen}
        question={craftChallenge.activeChallenge?.question ?? null}
        recipeLabel={craftChallenge.activeChallenge?.recipeLabel}
        costSummary={craftChallenge.activeChallenge?.costSummary}
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
          resourceStats={resourceStats}
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
