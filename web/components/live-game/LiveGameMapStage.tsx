"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { ExploreSceneDpad } from "@/components/lesson/interactions/explore-scene/ExploreSceneDpad";
import { LiveGameDebugPanel } from "@/components/live-game/LiveGameDebugPanel";
import { LiveGameMapStatic, useLiveGameMapStaticProps } from "@/components/live-game/LiveGameMapStatic";
import { LocalPlayer } from "@/components/live-game/LocalPlayer";
import { RemotePlayers } from "@/components/live-game/RemotePlayer";
import type { LiveGameDirection, LiveGameResourceNodeState } from "@/lib/live-game/liveblocks/config";
import { useViewportSize } from "@/lib/live-game/hooks/useLiveGameCamera";
import { useLocalMovement } from "@/lib/live-game/hooks/useLocalMovement";
import { useRemotePlayers } from "@/lib/live-game/hooks/useRemotePlayers";
import type { LiveGameLobbyPlayerEntry } from "@/lib/live-game/liveblocks/use-live-game-lobby";
import {
  ENGLISH_CRAFT_MAP_ZOOM,
} from "@/lib/live-game/modes/english-craft/config";
import type { LiveGameMapDef } from "@/lib/live-game/modes/types";
import type { LiveGameMapVisualMode } from "@/lib/live-game/modes/english-craft/lobby-map-v1";
import { resolveEnglishCraftMapVisuals } from "@/lib/live-game/modes/english-craft/lobby-map-v1";
import { LIVE_GAME_GROUND_COLOR } from "@/lib/live-game/tiles/grass-tile-pack";

export type LiveGameMapStageMovement = {
  getPosition: () => { x: number; y: number };
  sampledPosition: { x: number; y: number };
  setTouchAxis: (axisX: number, axisY: number) => void;
  facing: LiveGameDirection;
  isMoving: boolean;
};

export type LiveGameMapStageState = LiveGameMapStageMovement & {
  cameraRef: RefObject<HTMLDivElement | null>;
  localPlayerRef: RefObject<HTMLDivElement | null>;
  remotes: ReturnType<typeof useRemotePlayers>;
  mapStaticProps: ReturnType<typeof useLiveGameMapStaticProps>;
  now: number;
};

type UseLiveGameMapStageOptions = {
  map: LiveGameMapDef;
  spawnIndex: number;
  avatarId: string;
  movementEnabled: boolean;
  players: LiveGameLobbyPlayerEntry[];
  /** Defaults to `playing`. Lobby uses static full trees and an unbuilt bridge. */
  visualMode?: LiveGameMapVisualMode;
  resourceNodes: Record<string, LiveGameResourceNodeState>;
  bridgeCrafted: boolean;
};

export function useLiveGameMapStage({
  map,
  spawnIndex,
  avatarId,
  movementEnabled,
  players,
  visualMode = "playing",
  resourceNodes,
  bridgeCrafted,
}: UseLiveGameMapStageOptions): LiveGameMapStageState {
  const [now, setNow] = useState(() => Date.now());
  const cameraRef = useRef<HTMLDivElement>(null);
  const localPlayerRef = useRef<HTMLDivElement>(null);
  const viewport = useViewportSize();

  const { getPosition, sampledPosition, setTouchAxis, facing, isMoving } = useLocalMovement({
    map,
    spawnIndex: spawnIndex >= 0 ? spawnIndex : 0,
    enabled: movementEnabled,
    avatarId,
    zoom: ENGLISH_CRAFT_MAP_ZOOM,
    viewportW: viewport.w,
    viewportH: viewport.h,
    cameraRef,
    localPlayerRef,
  });

  const playerMetaByUserId = useMemo(() => {
    const meta = new Map<string, { name: string; color: string }>();
    for (const entry of players) {
      meta.set(entry.id, { name: entry.player.name, color: entry.player.color });
    }
    return meta;
  }, [players]);

  const remotes = useRemotePlayers(playerMetaByUserId);

  const mapVisuals = useMemo(
    () => resolveEnglishCraftMapVisuals({ visualMode, resourceNodes, bridgeCrafted }),
    [visualMode, resourceNodes, bridgeCrafted],
  );
  const mapStaticProps = useLiveGameMapStaticProps(
    map,
    mapVisuals.resourceNodes,
    mapVisuals.bridgeCrafted,
    now,
  );

  useEffect(() => {
    if (visualMode === "lobby") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [visualMode]);

  return {
    cameraRef,
    localPlayerRef,
    getPosition,
    sampledPosition,
    setTouchAxis,
    facing,
    isMoving,
    remotes,
    mapStaticProps,
    now,
  };
}

type LiveGameMapStageProps = {
  map: LiveGameMapDef;
  stage: LiveGameMapStageState;
  displayName: string;
  avatarId: string;
  showDpad?: boolean;
  showDebugPanel?: boolean;
  /** HUD and other overlays above the map (pointer-events managed by children). */
  children?: ReactNode;
  /** Bottom chrome below overlays (e.g. interact prompt + D-pad). */
  footer?: ReactNode;
};

export function LiveGameMapStage({
  map,
  stage,
  displayName,
  avatarId,
  showDpad = true,
  showDebugPanel = true,
  children,
  footer,
}: LiveGameMapStageProps) {
  const {
    cameraRef,
    localPlayerRef,
    sampledPosition,
    setTouchAxis,
    facing,
    isMoving,
    remotes,
    mapStaticProps,
  } = stage;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ backgroundColor: LIVE_GAME_GROUND_COLOR }}>
      <div className="absolute inset-0 overflow-hidden">
        <div ref={cameraRef} className="absolute left-0 top-0 isolate transform-gpu will-change-transform">
          <LiveGameMapStatic {...mapStaticProps} />
          <div className="pointer-events-none absolute inset-0 z-30">
            <RemotePlayers map={map} players={remotes} />
            <LocalPlayer
              map={map}
              wrapperRef={localPlayerRef}
              displayName={displayName}
              avatarId={avatarId}
              facing={facing}
              isMoving={isMoving}
            />
          </div>
        </div>
      </div>

      {children}

      {footer != null || showDpad ?
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col">
          <div className="mt-auto flex flex-col gap-3 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
            {footer}
            {showDpad ?
              <div className="pointer-events-auto inline-flex w-fit rounded-2xl border-2 border-white/20 bg-black/60 p-1.5">
                <ExploreSceneDpad axisX={0} axisY={0} onAxisChange={setTouchAxis} />
              </div>
            : null}
          </div>
        </div>
      : null}

      {showDebugPanel ?
        <LiveGameDebugPanel position={sampledPosition} remoteCount={remotes.length} />
      : null}
    </div>
  );
}
