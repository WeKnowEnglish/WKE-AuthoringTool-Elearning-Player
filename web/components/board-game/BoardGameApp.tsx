"use client";

import { useEffect, useState } from "react";
import { BoardGame } from "@/components/board-game/BoardGame";
import { MapBuilderApp } from "@/components/board-game/builder/MapBuilderApp";
import { BoardGameSetup } from "@/components/board-game/BoardGameSetup";
import { initRuntimeForSetup, restartGame } from "@/lib/board-game/game-engine";
import { createEmptySetup } from "@/lib/board-game/question-utils";
import {
  clearStoredRuntime,
  clearStoredSetup,
  readStoredRuntime,
  readStoredSetup,
  writeStoredRuntime,
  writeStoredSetup,
} from "@/lib/board-game/storage";
import type { GameRuntime, GameSetup } from "@/lib/board-game/types";

type AppMode = "setup" | "builder" | "play";

export function BoardGameApp() {
  const [setup, setSetup] = useState<GameSetup>(() => createEmptySetup(3));
  const [runtime, setRuntime] = useState<GameRuntime | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [mode, setMode] = useState<AppMode>("setup");
  const [mapLibraryKey, setMapLibraryKey] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const storedSetup = readStoredSetup();
    const storedRuntime = readStoredRuntime();
    /* eslint-disable react-hooks/set-state-in-effect -- hydrate game state from localStorage once on mount */
    if (storedSetup) {
      setSetup(storedSetup);
    }
    if (storedRuntime && storedSetup) {
      setRuntime(storedRuntime);
      setGameStarted(true);
      setMode("play");
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeStoredSetup(setup);
  }, [setup, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    writeStoredRuntime(gameStarted ? runtime : null);
  }, [runtime, gameStarted, hydrated]);

  function handleSetupChange(nextSetup: GameSetup) {
    setSetup(nextSetup);
  }

  function handleStart() {
    const nextRuntime = initRuntimeForSetup(setup);
    setRuntime(nextRuntime);
    setGameStarted(true);
    setMode("play");
  }

  function handleBackToSetup() {
    setGameStarted(false);
    setMode("setup");
    clearStoredRuntime();
  }

  function handleRestart() {
    const nextRuntime = restartGame(setup);
    setRuntime(nextRuntime);
  }

  function handleClear() {
    const empty = createEmptySetup(3);
    setSetup(empty);
    setRuntime(null);
    setGameStarted(false);
    setMode("setup");
    clearStoredSetup();
    clearStoredRuntime();
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-xl font-bold text-kid-ink">
        Loading board game...
      </div>
    );
  }

  if (mode === "builder") {
    return (
      <MapBuilderApp
        initialMapId={setup.mapId ?? null}
        onBack={() => {
          setMode("setup");
          setMapLibraryKey((key) => key + 1);
        }}
        onUseMap={(mapId) => {
          setSetup((current) => ({ ...current, mapId, map: undefined }));
          setMode("setup");
          setMapLibraryKey((key) => key + 1);
        }}
      />
    );
  }

  if (!gameStarted || !runtime) {
    return (
      <BoardGameSetup
        setup={setup}
        onChange={handleSetupChange}
        onStart={handleStart}
        onClear={handleClear}
        onOpenBuilder={() => setMode("builder")}
        onEditMap={(mapId) => {
          setSetup((current) => ({ ...current, mapId }));
          setMode("builder");
        }}
        mapLibraryKey={mapLibraryKey}
        onMapLibraryChange={() => setMapLibraryKey((key) => key + 1)}
      />
    );
  }

  return (
    <BoardGame
      setup={setup}
      runtime={runtime}
      onRuntimeChange={setRuntime}
      onBackToSetup={handleBackToSetup}
      onRestart={handleRestart}
    />
  );
}
