"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useStorage } from "@liveblocks/react/suspense";
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
import { LiveGameEndReportOverlay } from "@/components/live-game/LiveGameEndReportOverlay";
import { LiveGameSessionTimerChip } from "@/components/live-game/LiveGameSessionTimerChip";
import { LiveGameSessionTimerFlash } from "@/components/live-game/LiveGameSessionTimerFlash";
import { LiveGameCarrySlotBar } from "@/components/live-game/LiveGameCarrySlotBar";
import {
  LiveGameInteractPrompt,
  LiveGameTeamResourceHud,
} from "@/components/live-game/LiveGameWoodHud";
import type { LiveGameSessionContext } from "@/lib/live-game/liveblocks/identity";
import { toRoomId } from "@/lib/live-game/liveblocks/room-id";
import { expandInteractRadius, findNearestInteractable } from "@/lib/live-game/engine/interact";
import { LIVE_GAME_CHALLENGE_PREFETCH_DEBOUNCE_MS, LIVE_GAME_CHALLENGE_PREFETCH_RADIUS_BONUS_PX } from "@/lib/live-game/challenge-prefetch";
import {
  isUsableLiveGamePositionSyncResult,
  positionSyncOutcomeForDiagnostic,
  prefetchFailReasonFromPositionSync,
} from "@/lib/live-game/challenge-position-sync";
import {
  bagHasMatchingResource,
  depositResourceTypeFromBag,
  getHeldVisual,
  isHoldingBread,
  playerCarryIsFull,
} from "@/lib/live-game/carry-bag";
import { recordLiveGameDiagnostic } from "@/lib/live-game/diagnostics/client";
import { liveGameQuestionDeckCursorKey } from "@/lib/live-game/question-deck";
import { useLiveGameCraftChallenge } from "@/lib/live-game/hooks/useLiveGameCraftChallenge";
import { useLiveGameDepositChallenge } from "@/lib/live-game/hooks/useLiveGameDepositChallenge";
import { useLiveGameAvatar } from "@/lib/live-game/hooks/useLiveGameAvatar";
import { useLiveGameBoatBoarding } from "@/lib/live-game/hooks/useLiveGameBoatBoarding";
import {
  useLiveGameBoatBoardingUnlocked,
  useLiveGameCraftedItems,
  useLiveGameResourceNodes,
  useLiveGameResourcePool,
  useLiveGameSelfCarry,
  useLiveGameSelfInventory,
} from "@/lib/live-game/hooks/useLiveGameGameplay";
import { useLiveGameConsume } from "@/lib/live-game/hooks/useLiveGameConsume";
import { useLiveGameDropCarry } from "@/lib/live-game/hooks/useLiveGameDropCarry";
import { useLiveGameHoldCarry } from "@/lib/live-game/hooks/useLiveGameHoldCarry";
import { useLiveGameInteractionPositionSync } from "@/lib/live-game/hooks/useLiveGameInteractionPositionSync";
import { useLiveGameSelfHungerDisplay } from "@/lib/live-game/hooks/useLiveGameHunger";
import { useLiveGameHarvestChallenge } from "@/lib/live-game/hooks/useLiveGameHarvestChallenge";
import { useLiveGameAutoTimeout } from "@/lib/live-game/hooks/useLiveGameAutoTimeout";
import { useLiveGameSessionTimer } from "@/lib/live-game/hooks/useLiveGameSessionTimer";
import { useLiveGameLobby } from "@/lib/live-game/liveblocks/use-live-game-lobby";
import type {
  LiveGameResourceNodeState,
  LiveGameResourceType,
  LiveGameStorageSnapshot,
} from "@/lib/live-game/liveblocks/config";
import { getMapForMode } from "@/lib/live-game/modes";
import { ENGLISH_CRAFT_MODE } from "@/lib/live-game/modes/english-craft/config";
import {
  depositInteractLabel,
  ENGLISH_CRAFT_BOAT_HAMMER_GOAL,
  ENGLISH_CRAFT_CARRY_CAPACITY_BACKPACK,
  ENGLISH_CRAFT_CARRY_CAPACITY_BASE,
  ENGLISH_CRAFT_CRAFT_BENCH_ID,
  ENGLISH_CRAFT_HUNGER_STARVING_SPEED_MULTIPLIER,
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
import type { LiveGamePresence } from "@/lib/live-game/liveblocks/config";
import { getEnglishCraftCollisionRects } from "@/lib/live-game/modes/english-craft/map-v1";

type Props = {
  context: LiveGameSessionContext;
};

const CRAFT_BENCH_PREFETCH_TARGET = expandInteractRadius(
  ENGLISH_CRAFT_CRAFT_BENCH_V1,
  LIVE_GAME_CHALLENGE_PREFETCH_RADIUS_BONUS_PX,
);

function isNodeInteractable(node: LiveGameResourceNodeState | undefined, now = Date.now()) {
  if (!node) return true;
  return isEnglishCraftResourceNodeInteractable(node, now);
}

export function LiveGameCanvas({ context }: Props) {
  const { players, selfEntry, session, isHost, returnToLobby, endRoundAndReturnToLobby, addMinute, grantPoolResource, self, others } =
    useLiveGameLobby();
  const [endSessionModalOpen, setEndSessionModalOpen] = useState(false);
  const [isAddingTime, setIsAddingTime] = useState(false);
  const [hostGrantingType, setHostGrantingType] = useState<LiveGameResourceType | null>(null);
  const [recipePickerOpen, setRecipePickerOpen] = useState(false);
  const { avatarId } = useLiveGameAvatar(context);
  const baseMap = getMapForMode(session.mapId, session.modeId);
  const pool = useLiveGameResourcePool();
  const resourceNodes = useLiveGameResourceNodes();
  const selfCarry = useLiveGameSelfCarry();
  const selfInventory = useLiveGameSelfInventory();
  const craftedItems = useLiveGameCraftedItems();
  const benchBuilt = craftedItems.benchBuilt;
  const boatBuilt = craftedItems.boat;
  const boatBoardingUnlocked = useLiveGameBoatBoardingUnlocked();
  const roomId = toRoomId(context.sessionId);
  const selfId = self?.id ?? context.userId;
  const harvestQuestionCursor = useStorage((root) => {
    const cursors = (root as unknown as LiveGameStorageSnapshot).questionDeckCursors;
    return Math.max(0, Math.floor(cursors?.[liveGameQuestionDeckCursorKey(selfId, "harvest")] ?? 0));
  });
  const craftQuestionCursor = useStorage((root) => {
    const cursors = (root as unknown as LiveGameStorageSnapshot).questionDeckCursors;
    return Math.max(0, Math.floor(cursors?.[liveGameQuestionDeckCursorKey(selfId, "craft")] ?? 0));
  });
  const buildBenchRecipe = ENGLISH_CRAFT_BUILD_BENCH_RECIPE;
  const buildBenchCostSummary = formatRecipeCostSummary(buildBenchRecipe);

  const gameplaySnapshot = useMemo(
    () => ({
      session: { phase: session.phase },
      resourcePool: pool,
      craftedItems,
      playerInventory: selfId ? { [selfId]: selfInventory } : undefined,
      playerCarry: selfId && selfCarry ? { [selfId]: selfCarry } : undefined,
    }),
    [craftedItems, pool, selfCarry, selfId, selfInventory, session.phase],
  );

  const spawnIndex = selfEntry ?
    Math.max(0, players.findIndex((entry) => entry.id === selfEntry.id))
  : 0;

  const harvestChallenge = useLiveGameHarvestChallenge({
    roomId,
    playerId: selfId,
    questionCursor: harvestQuestionCursor,
  });
  const depositChallenge = useLiveGameDepositChallenge({ roomId, playerId: selfId });
  const craftChallenge = useLiveGameCraftChallenge({
    roomId,
    playerId: selfId,
    questionCursor: craftQuestionCursor,
  });

  const isCarrying = selfCarry != null;
  const carryFull = playerCarryIsFull(
    {
      session: { phase: session.phase } as never,
      players: {},
      playerInventory: selfId ? { [selfId]: selfInventory } : undefined,
      playerCarry: selfId && selfCarry ? { [selfId]: selfCarry } : undefined,
    },
    selfId,
  );
  const heldVisual = getHeldVisual(selfCarry);
  const holdingBread = isHoldingBread(selfCarry);
  const canBuildBench = !benchBuilt && canAffordRecipePoolCost(pool, buildBenchRecipe);
  const canCraftAtBench = benchBuilt && !boatBuilt;
  const isRecipePickerOpen = recipePickerOpen && canCraftAtBench;
  const isPlaying = session.phase === "playing";
  const isCompleted = session.phase === "completed";
  const hunger = useLiveGameSelfHungerDisplay({ playing: isPlaying });
  const consume = useLiveGameConsume({ roomId });
  const dropCarry = useLiveGameDropCarry({ roomId });
  const holdCarry = useLiveGameHoldCarry({ roomId });
  const carryCapacity = selfInventory.backpack
    ? ENGLISH_CRAFT_CARRY_CAPACITY_BACKPACK
    : ENGLISH_CRAFT_CARRY_CAPACITY_BASE;
  const movementSpeedMultiplier =
    isPlaying && hunger.isStarving ? ENGLISH_CRAFT_HUNGER_STARVING_SPEED_MULTIPLIER : 1;
  const sessionTimer = useLiveGameSessionTimer({
    endsAt: session.endsAt,
    enabled: isPlaying,
    showStudentFlashes: !isHost,
  });
  const anyChallengeOpen =
    harvestChallenge.isOpen ||
    depositChallenge.isOpen ||
    craftChallenge.isOpen ||
    isRecipePickerOpen;
  const movementEnabled = isPlaying && !anyChallengeOpen && !endSessionModalOpen;

  useLiveGameAutoTimeout({
    enabled: isPlaying,
    isExpired: sessionTimer?.isExpired ?? false,
    hasTimedSession: session.endsAt != null,
    endsAt: session.endsAt,
    onTimeout: endRoundAndReturnToLobby,
  });

  const map = useMemo(
    () => ({
      ...baseMap,
      collisionRects: getEnglishCraftCollisionRects(),
    }),
    [baseMap],
  );

  const stage = useLiveGameMapStage({
    map,
    spawnIndex,
    avatarId,
    movementEnabled,
    speedMultiplier: movementSpeedMultiplier,
    players,
    visualMode: "playing",
    resourceNodes,
    craftedItems,
    resourcePool: pool,
  });

  const { getPosition, sampledPosition, now } = stage;
  const { syncInteractionPosition: runInteractionPositionSync, publishCurrentPosition } =
    useLiveGameInteractionPositionSync({ roomId, playerId: selfId });
  const syncInteractionPosition = useCallback(
    (force = false) => runInteractionPositionSync(getPosition, force),
    [getPosition, runInteractionPositionSync],
  );
  const publishPosition = useCallback(
    () => publishCurrentPosition(getPosition),
    [getPosition, publishCurrentPosition],
  );

  const connectedBoardingPlayers = useMemo(() => {
    const entries: Array<{ id: string; x: number; y: number }> = [];
    if (selfId) {
      entries.push({
        id: selfId,
        x: sampledPosition.x,
        y: sampledPosition.y,
      });
    }
    for (const other of others) {
      const presence = other.presence as Partial<LiveGamePresence> | null;
      if (typeof presence?.x !== "number" || typeof presence?.y !== "number") continue;
      entries.push({
        id: other.id ?? String(other.connectionId),
        x: presence.x,
        y: presence.y,
      });
    }
    return entries;
  }, [others, sampledPosition.x, sampledPosition.y, selfId]);

  const syncBoardingPosition = useCallback(async () => {
    await publishPosition();
  }, [publishPosition]);

  const boatBoarding = useLiveGameBoatBoarding({
    roomId,
    enabled: isPlaying && boatBoardingUnlocked,
    connectedPlayers: connectedBoardingPlayers,
    onSyncPosition: syncBoardingPosition,
    onBeforeComplete: syncBoardingPosition,
  });

  const interactableNodes = useMemo(
    () =>
      ENGLISH_CRAFT_RESOURCE_NODES_V1.filter((node) =>
        isNodeInteractable(resourceNodes[node.id], now),
      ),
    [now, resourceNodes],
  );

  const carryStorageDef = useMemo(() => {
    if (!selfCarry) return null;
    const preferred = depositResourceTypeFromBag(selfCarry);
    if (preferred) return ENGLISH_CRAFT_STORAGE_BY_TYPE[preferred];
    const fallbackType = (["wood", "stone", "wheat", "cotton"] as const).find((type) =>
      bagHasMatchingResource(selfCarry, type),
    );
    return fallbackType ? ENGLISH_CRAFT_STORAGE_BY_TYPE[fallbackType] : null;
  }, [selfCarry]);

  const depositTarget = useMemo(() => {
    if (!selfCarry) return null;
    const matchingStorages = (["wood", "stone", "wheat", "cotton"] as const)
      .filter((type) => bagHasMatchingResource(selfCarry, type))
      .map((type) => toStorageInteractTarget(ENGLISH_CRAFT_STORAGE_BY_TYPE[type]));
    if (matchingStorages.length === 0) return null;
    return findNearestInteractable(sampledPosition.x, sampledPosition.y, matchingStorages);
  }, [selfCarry, sampledPosition.x, sampledPosition.y]);

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
    if (carryFull) return null;
    return findNearestInteractable(
      sampledPosition.x,
      sampledPosition.y,
      interactableNodes,
    );
  }, [interactableNodes, carryFull, sampledPosition.x, sampledPosition.y]);

  const depositPrefetchInteractTarget = useMemo(
    () =>
      carryStorageDef ?
        expandInteractRadius(
          toStorageInteractTarget(carryStorageDef),
          LIVE_GAME_CHALLENGE_PREFETCH_RADIUS_BONUS_PX,
        )
      : null,
    [carryStorageDef],
  );

  const expandedInteractableNodes = useMemo(
    () =>
      interactableNodes.map((node) =>
        expandInteractRadius(node, LIVE_GAME_CHALLENGE_PREFETCH_RADIUS_BONUS_PX),
      ),
    [interactableNodes],
  );

  const depositPrefetchTarget = useMemo(() => {
    if (!depositPrefetchInteractTarget) return null;
    return findNearestInteractable(
      sampledPosition.x,
      sampledPosition.y,
      [depositPrefetchInteractTarget],
    );
  }, [depositPrefetchInteractTarget, sampledPosition.x, sampledPosition.y]);

  const benchPrefetchTarget = useMemo(
    () =>
      findNearestInteractable(sampledPosition.x, sampledPosition.y, [
        CRAFT_BENCH_PREFETCH_TARGET,
      ]),
    [sampledPosition.x, sampledPosition.y],
  );

  const harvestPrefetchTarget = useMemo(() => {
    if (carryFull) return null;
    return findNearestInteractable(
      sampledPosition.x,
      sampledPosition.y,
      expandedInteractableNodes,
    );
  }, [expandedInteractableNodes, carryFull, sampledPosition.x, sampledPosition.y]);

  const defaultBenchRecipeId = useMemo(
    () => getDefaultBenchRecipe(gameplaySnapshot, selfId),
    [gameplaySnapshot, selfId],
  );
  const depositPrefetchStorageId =
    isCarrying && depositPrefetchTarget && carryStorageDef ? carryStorageDef.id : null;
  const craftPrefetchRecipeId =
    canBuildBench && benchPrefetchTarget ? "build_bench"
    : canCraftAtBench && benchPrefetchTarget ? defaultBenchRecipeId
    : null;
  const harvestPrefetchNodeId = !carryFull ? (harvestPrefetchTarget?.id ?? null) : null;
  const harvestPrefetchCooldownEndsAt =
    harvestPrefetchNodeId ? (resourceNodes[harvestPrefetchNodeId]?.cooldownEndsAt ?? null) : null;

  const handleRecipeSelect = useCallback(
    (recipeId: CraftRecipeId, recipe: CraftRecipe) => {
      setRecipePickerOpen(false);
      const positionSync = syncInteractionPosition(true);
      void craftChallenge.beginChallenge(
        recipeId,
        recipe.label,
        formatRecipeFullCostSummary(recipe),
        positionSync,
      );
    },
    [craftChallenge, syncInteractionPosition],
  );

  const handleEatBread = useCallback(() => {
    if (!holdingBread || !isPlaying || anyChallengeOpen) return;
    void consume.consumeBread();
  }, [anyChallengeOpen, consume, holdingBread, isPlaying]);

  const handleInteract = useCallback(() => {
    if (
      harvestChallenge.isOpen ||
      depositChallenge.isOpen ||
      craftChallenge.isOpen ||
      isRecipePickerOpen
    ) {
      return;
    }

    if (holdingBread) {
      handleEatBread();
      return;
    }

    const position = getPosition();

    if (selfCarry) {
      const matchingStorages = (["wood", "stone", "wheat", "cotton"] as const)
        .filter((type) => bagHasMatchingResource(selfCarry, type))
        .map((type) => ENGLISH_CRAFT_STORAGE_BY_TYPE[type]);
      const nearStorage = findNearestInteractable(
        position.x,
        position.y,
        matchingStorages.map((storage) => toStorageInteractTarget(storage)),
      );
      if (nearStorage) {
        const storageDef = matchingStorages.find((storage) => storage.id === nearStorage.id);
        if (storageDef) {
          void depositChallenge.beginChallenge(storageDef, syncInteractionPosition(true));
          return;
        }
      }
    }

    if (canBuildBench) {
      const bench = findNearestInteractable(position.x, position.y, [ENGLISH_CRAFT_CRAFT_BENCH_V1]);
      if (bench) {
        const positionSync = syncInteractionPosition(true);
        void craftChallenge.beginChallenge(
          "build_bench",
          buildBenchRecipe.label,
          buildBenchCostSummary,
          positionSync,
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

    if (carryFull) return;

    const node = findNearestInteractable(position.x, position.y, interactableNodes);
    if (!node) return;
    void harvestChallenge.beginChallenge(
      node,
      resourceNodes[node.id]?.cooldownEndsAt ?? null,
      syncInteractionPosition(true),
    );
  }, [
    buildBenchCostSummary,
    buildBenchRecipe.label,
    canBuildBench,
    canCraftAtBench,
    carryFull,
    craftChallenge,
    depositChallenge,
    getPosition,
    handleEatBread,
    harvestChallenge,
    holdingBread,
    interactableNodes,
    isRecipePickerOpen,
    resourceNodes,
    selfCarry,
    syncInteractionPosition,
  ]);

  useEffect(() => {
    if (!isPlaying) {
      harvestChallenge.cancelPrefetch();
      depositChallenge.cancelPrefetch();
      craftChallenge.cancelPrefetch();
      return;
    }

    if (
      anyChallengeOpen ||
      harvestChallenge.isSubmitting ||
      depositChallenge.isSubmitting ||
      craftChallenge.isSubmitting
    ) {
      // Soft-release non-open activities so briefly overlapping prefetches can finish
      // during the leave-grace window instead of aborting immediately.
      if (!harvestChallenge.isOpen) harvestChallenge.releasePrefetchFocus();
      if (!depositChallenge.isOpen) depositChallenge.releasePrefetchFocus();
      if (!craftChallenge.isOpen) craftChallenge.releasePrefetchFocus();
      return;
    }

    if (depositPrefetchStorageId) {
      harvestChallenge.releasePrefetchFocus();
      craftChallenge.releasePrefetchFocus();
      const timeout = window.setTimeout(() => {
        void syncInteractionPosition().then((result) => {
          if (isUsableLiveGamePositionSyncResult(result)) {
            void depositChallenge.prefetchForStorage(depositPrefetchStorageId);
          } else {
            recordLiveGameDiagnostic("gameplay", "deposit_prefetch", {
              storageId: depositPrefetchStorageId,
              prefetchOutcome: "failed",
              prefetchFailReason: prefetchFailReasonFromPositionSync(result),
              positionSyncOutcome: positionSyncOutcomeForDiagnostic(result),
              positionSyncUsable: false,
              requestCallbackInvoked: false,
              requestReachedFetch: false,
              prefetched: true,
            });
          }
        });
      }, LIVE_GAME_CHALLENGE_PREFETCH_DEBOUNCE_MS);
      return () => {
        window.clearTimeout(timeout);
        depositChallenge.releasePrefetchFocus();
      };
    }

    if (craftPrefetchRecipeId) {
      harvestChallenge.releasePrefetchFocus();
      depositChallenge.releasePrefetchFocus();
      const timeout = window.setTimeout(() => {
        void syncInteractionPosition().then((result) => {
          if (isUsableLiveGamePositionSyncResult(result)) {
            void craftChallenge.prefetchChallenge(craftPrefetchRecipeId);
          } else {
            recordLiveGameDiagnostic("gameplay", "craft_prefetch", {
              recipeId: craftPrefetchRecipeId,
              machineId: ENGLISH_CRAFT_CRAFT_BENCH_ID,
              prefetchOutcome: "failed",
              prefetchFailReason: prefetchFailReasonFromPositionSync(result),
              positionSyncOutcome: positionSyncOutcomeForDiagnostic(result),
              positionSyncUsable: false,
              requestCallbackInvoked: false,
              requestReachedFetch: false,
              prefetched: true,
            });
          }
        });
      }, LIVE_GAME_CHALLENGE_PREFETCH_DEBOUNCE_MS);
      return () => {
        window.clearTimeout(timeout);
        craftChallenge.releasePrefetchFocus();
      };
    }

    if (harvestPrefetchNodeId) {
      depositChallenge.releasePrefetchFocus();
      craftChallenge.releasePrefetchFocus();
      const timeout = window.setTimeout(() => {
        void syncInteractionPosition().then((result) => {
          if (isUsableLiveGamePositionSyncResult(result)) {
            void harvestChallenge.prefetchForNode(
              harvestPrefetchNodeId,
              harvestPrefetchCooldownEndsAt,
            );
          } else {
            recordLiveGameDiagnostic("gameplay", "harvest_prefetch", {
              nodeId: harvestPrefetchNodeId,
              prefetchOutcome: "failed",
              prefetchFailReason: prefetchFailReasonFromPositionSync(result),
              positionSyncOutcome: positionSyncOutcomeForDiagnostic(result),
              positionSyncUsable: false,
              requestCallbackInvoked: false,
              requestReachedFetch: false,
              prefetched: true,
            });
          }
        });
      }, LIVE_GAME_CHALLENGE_PREFETCH_DEBOUNCE_MS);
      return () => {
        window.clearTimeout(timeout);
        harvestChallenge.releasePrefetchFocus();
      };
    }

    harvestChallenge.releasePrefetchFocus();
    depositChallenge.releasePrefetchFocus();
    craftChallenge.releasePrefetchFocus();
  }, [
    anyChallengeOpen,
    craftPrefetchRecipeId,
    craftChallenge,
    depositPrefetchStorageId,
    depositChallenge,
    harvestChallenge,
    harvestPrefetchCooldownEndsAt,
    harvestPrefetchNodeId,
    isPlaying,
    syncInteractionPosition,
  ]);

  useEffect(() => {
    if (!canBuildBench && !canCraftAtBench) {
      craftChallenge.clearPrefetchCache();
    }
  }, [canBuildBench, canCraftAtBench, craftChallenge]);

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
    : hunger.isStarving ?
      "Starving — movement slowed. Hold bread and press E to eat."
    : hunger.isLow && benchBuilt && !boatBuilt ?
      "You're getting hungry — craft bread at the workbench"
    : holdingBread ?
      "Holding bread — press E to eat"
    : isCarrying ?
      "Take resources to matching storage and spell — E or Interact"
    : boatBuilt ?
      "Get everyone on the boat at the dock to escape!"
    : benchBuilt && craftBenchTarget ?
      "Craft a backpack, hammers, bread, or the boat at the workbench"
    : benchBuilt && hammersNeeded > 0 ?
      `Craft hammers — need ${hammersNeeded} more for the boat`
    : benchBuilt && !canAffordBoatPool ?
      "Deposit wood and cotton to craft the boat"
    : canBuildBench ?
      "Build the workbench at the stump — E or Interact"
    : "Deposit wood and stone to build the workbench";

  const hasInteractTarget =
    holdingBread ||
    depositTarget != null ||
    craftBenchTarget != null ||
    (harvestTarget != null && !carryFull);

  const interactLabel =
    holdingBread ?
      "Eat bread"
    : depositTarget && selfCarry ?
      depositInteractLabel(depositResourceTypeFromBag(selfCarry) ?? "wood")
    : craftBenchTarget && canBuildBench ?
      "Build workbench"
    : craftBenchTarget && canCraftAtBench ?
      "Craft at workbench"
    : harvestTarget ?
      harvestInteractLabel(harvestTarget.resourceType, harvestTarget.label)
    : boatBuilt ?
      "Board the boat"
    : isCarrying ?
      "Go to storage"
    : "Gather resource";

  const handlePlayAgain = useCallback(() => {
    returnToLobby();
  }, [returnToLobby]);

  const handleAddMinute = useCallback(async () => {
    if (isAddingTime) return;
    setIsAddingTime(true);
    try {
      await addMinute();
    } catch (error) {
      console.error("Could not add time to Live Game", error);
    } finally {
      setIsAddingTime(false);
    }
  }, [addMinute, isAddingTime]);

  const handleHostGrantResource = useCallback(
    async (resourceType: LiveGameResourceType) => {
      if (!isHost || !isPlaying || hostGrantingType) return;
      setHostGrantingType(resourceType);
      try {
        await grantPoolResource(resourceType);
      } catch (error) {
        console.error("Could not grant Live Game pool resources", error);
      } finally {
        setHostGrantingType(null);
      }
    },
    [grantPoolResource, hostGrantingType, isHost, isPlaying],
  );

  const handleDropCarry = useCallback(async () => {
    const dropped = await dropCarry.dropCarry();
    if (!dropped) return;
    depositChallenge.closeChallenge();
    depositChallenge.clearPrefetchCache();
  }, [depositChallenge, dropCarry]);

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
                    onAddMinute={() => void handleAddMinute()}
                    addMinuteDisabled={isAddingTime || !isPlaying}
                    onEndSessionClick={() => setEndSessionModalOpen(true)}
                    endDisabled={!isPlaying}
                  />
                : sessionTimer ?
                  <LiveGameSessionTimerChip label={sessionTimer.label} urgent={timerUrgent} />
                : null}
                <LiveGameTeamResourceHud
                  pool={pool}
                  carriedResourceType={heldVisual}
                  hammers={craftedItems.hammers}
                  benchBuilt={craftedItems.benchBuilt}
                  boatBuilt={craftedItems.boat}
                  hungerValue={hunger.value}
                  hungerIsLow={hunger.isLow}
                  hungerIsStarving={hunger.isStarving}
                  hostGrantEnabled={isHost && isPlaying}
                  hostGrantDisabled={hostGrantingType != null}
                  hostGrantingType={hostGrantingType}
                  onHostGrantResource={(type) => void handleHostGrantResource(type)}
                />
              </div>
            </div>
            <LiveGameConnectionBanner className="mt-2 rounded-lg border-2 border-amber-300/80 bg-amber-950/90 px-3 py-2 text-sm font-semibold text-amber-100 backdrop-blur-sm" />
          </header>

          <div className="pointer-events-none mt-auto flex justify-center px-3 pb-[max(5.5rem,env(safe-area-inset-bottom))]">
            <LiveGameCarrySlotBar
              bag={selfCarry}
              capacity={carryCapacity}
              backpackOwned={selfInventory.backpack}
              disabled={!isPlaying || anyChallengeOpen || holdCarry.isSubmitting}
              onHoldSlot={(slotIndex) => void holdCarry.holdSlot(slotIndex)}
              onDropHeld={() => void handleDropCarry()}
              dropDisabled={!isPlaying || dropCarry.isSubmitting}
              dropSubmitting={dropCarry.isSubmitting}
              onEatHeld={() => handleEatBread()}
              eatDisabled={!isPlaying || anyChallengeOpen}
              eatSubmitting={consume.isSubmitting}
              holdingBread={holdingBread}
            />
          </div>

          {boatBoardingUnlocked && isPlaying && boatBoarding.totalPlayers > 0 ?
            <div className="pointer-events-none mt-3 flex justify-center px-3">
              <div className="w-full max-w-md rounded-xl border-2 border-sky-200/70 bg-sky-950/85 px-4 py-3 text-center text-sky-50 backdrop-blur-sm">
                <p className="text-sm font-extrabold">
                  On the boat: {boatBoarding.onBoatCount}/{boatBoarding.totalPlayers}
                </p>
                <p className="mt-1 text-xs font-semibold text-sky-100/85">
                  {boatBoarding.allOnBoat ?
                    "Hold together for 2 seconds to escape!"
                  : "Waiting for the whole team..."}
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-sky-950">
                  <div
                    className="h-full rounded-full bg-sky-300 transition-all duration-150"
                    style={{ width: `${Math.round(boatBoarding.dwellProgress * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          : null}
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
        onSkip={() => harvestChallenge.skipChallenge()}
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
        onSkip={() => depositChallenge.skipChallenge()}
        onDropCarry={() => void handleDropCarry()}
        onClose={depositChallenge.closeChallenge}
      />

      <LiveGameCraftRecipePicker
        open={isRecipePickerOpen}
        pool={pool}
        craftedItems={craftedItems}
        playerId={selfId}
        playerInventory={selfInventory}
        playerCarry={selfCarry}
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
        onSkip={() => craftChallenge.skipChallenge()}
        onClose={craftChallenge.closeChallenge}
      />

      {isCompleted ?
        <LiveGameEndReportOverlay
          sessionId={context.sessionId}
          objectiveCompleted={session.objectiveCompleted}
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
