"use client";

import { LiveObject } from "@liveblocks/client";
import { useMutation } from "@liveblocks/react/suspense";
import { initRuntimeForSetup, restartGame } from "@/lib/board-game/game-engine";
import {
  applyGameRuntimeToLiveObject,
} from "@/lib/board-game/liveblocks/serializers/runtime";
import {
  applyGameSetupToLiveObject,
  cloneGameSetup,
  gameSetupFromStorage,
} from "@/lib/board-game/liveblocks/serializers/setup";
import type { GameRuntime, GameSetup } from "@/lib/board-game/types";

export function useStartGameMutation() {
  return useMutation(({ storage }, setup: GameSetup) => {
    const runtime = initRuntimeForSetup(setup);
    const setupSnapshot = cloneGameSetup(setup);

    const existingSetup = storage.get("setup");
    if (existingSetup) {
      applyGameSetupToLiveObject(existingSetup, setupSnapshot);
    } else {
      storage.set("setup", new LiveObject(setupSnapshot));
    }

    const existingRuntime = storage.get("runtime");
    if (existingRuntime) {
      applyGameRuntimeToLiveObject(existingRuntime, runtime);
    } else {
      storage.set("runtime", new LiveObject(runtime));
    }

    storage.get("lobby").set("phase", "playing");
  }, []);
}

export function useCommitRuntimeMutation() {
  return useMutation(({ storage }, runtime: GameRuntime) => {
    const existingRuntime = storage.get("runtime");
    if (existingRuntime) {
      applyGameRuntimeToLiveObject(existingRuntime, runtime);
    } else {
      storage.set("runtime", new LiveObject(runtime));
    }

    if (runtime.winnerIndex !== null) {
      storage.get("lobby").set("phase", "finished");
    }
  }, []);
}

export function useRestartGameMutation() {
  return useMutation(({ storage }) => {
    const setup = gameSetupFromStorage(storage.get("setup"));
    if (!setup) return;
    const runtime = restartGame(setup);
    const existingRuntime = storage.get("runtime");
    if (existingRuntime) {
      applyGameRuntimeToLiveObject(existingRuntime, runtime);
    } else {
      storage.set("runtime", new LiveObject(runtime));
    }
    storage.get("lobby").set("phase", "playing");
  }, []);
}

export function useBackToLobbyMutation() {
  return useMutation(({ storage }) => {
    storage.get("lobby").set("phase", "waiting");
  }, []);
}
