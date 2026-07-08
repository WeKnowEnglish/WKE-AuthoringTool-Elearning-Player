"use client";

import { useState } from "react";
import { BoardGame } from "@/components/board-game/BoardGame";
import { MapBuilderApp } from "@/components/board-game/builder/MapBuilderApp";
import { BoardGameSetup } from "@/components/board-game/BoardGameSetup";
import { useLocalBoardGameSession } from "@/lib/board-game/session";

type AppMode = "setup" | "builder" | "play";

export function BoardGameApp() {
  const session = useLocalBoardGameSession({ defaultPlayerCount: 3 });
  const [mode, setMode] = useState<AppMode>("setup");
  const [mapLibraryKey, setMapLibraryKey] = useState(0);

  const resolvedMode: AppMode =
    session.status === "ready" && session.gameStarted && mode !== "builder" ? "play" : mode;

  if (session.status === "hydrating") {
    return (
      <div className="flex min-h-dvh items-center justify-center text-xl font-bold text-kid-ink">
        Loading board game...
      </div>
    );
  }

  if (resolvedMode === "builder") {
    return (
      <MapBuilderApp
        initialMapId={session.setup.mapId ?? null}
        onBack={() => {
          setMode("setup");
          setMapLibraryKey((key) => key + 1);
        }}
        onUseMap={(mapId) => {
          session.setSetup({ ...session.setup, mapId, map: undefined });
          setMode("setup");
          setMapLibraryKey((key) => key + 1);
        }}
      />
    );
  }

  if (!session.gameStarted || !session.runtime) {
    return (
      <BoardGameSetup
        setup={session.setup}
        onChange={session.setSetup}
        onStart={session.startGame}
        onClear={() => {
          session.clearSession();
          setMode("setup");
        }}
        onOpenBuilder={() => setMode("builder")}
        onEditMap={(mapId) => {
          session.setSetup({ ...session.setup, mapId });
          setMode("builder");
        }}
        mapLibraryKey={mapLibraryKey}
        onMapLibraryChange={() => setMapLibraryKey((key) => key + 1)}
      />
    );
  }

  return (
    <BoardGame
      setup={session.setup}
      runtime={session.runtime}
      commitRuntime={session.commitRuntime}
      onBackToSetup={() => {
        session.backToSetup();
        setMode("setup");
      }}
      onRestart={session.restartGame}
    />
  );
}
