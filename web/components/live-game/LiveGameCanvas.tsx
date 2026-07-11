"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelf } from "@liveblocks/react/suspense";
import { ExploreSceneDpad } from "@/components/lesson/interactions/explore-scene/ExploreSceneDpad";
import { LiveGameMapStatic, useLiveGameMapStaticProps } from "@/components/live-game/LiveGameMapStatic";
import { LocalPlayer } from "@/components/live-game/LocalPlayer";
import { RemotePlayers } from "@/components/live-game/RemotePlayer";
import {
  LiveGameConnectionBanner,
  LiveGameDebugPanel,
} from "@/components/live-game/LiveGameDebugPanel";
import { LiveGameMcChallengeModal } from "@/components/live-game/LiveGameMcChallengeModal";
import {
  LiveGameInteractPrompt,
  LiveGameTeamHud,
} from "@/components/live-game/LiveGameWoodHud";
import type { LiveGameSessionContext } from "@/lib/live-game/liveblocks/identity";
import { toRoomId } from "@/lib/live-game/liveblocks/room-id";
import { findNearestInteractable } from "@/lib/live-game/engine/interact";
import { useViewportSize } from "@/lib/live-game/hooks/useLiveGameCamera";
import {
  useLiveGameResourceNodes,
  useLiveGameResourcePool,
} from "@/lib/live-game/hooks/useLiveGameGameplay";
import { useLocalMovement } from "@/lib/live-game/hooks/useLocalMovement";
import { useRemotePlayers } from "@/lib/live-game/hooks/useRemotePlayers";
import {
  useSteppedGrassTiles,
  type GrassTileWalker,
} from "@/lib/live-game/hooks/useSteppedGrassTiles";
import { useLiveGameWoodChallenge } from "@/lib/live-game/hooks/useLiveGameWoodChallenge";
import { useLiveGameLobby } from "@/lib/live-game/liveblocks/use-live-game-lobby";
import type { LiveGameResourceNodeState } from "@/lib/live-game/liveblocks/config";
import { getMapForMode } from "@/lib/live-game/modes";
import {
  ENGLISH_CRAFT_MAP_ZOOM,
  ENGLISH_CRAFT_MODE,
} from "@/lib/live-game/modes/english-craft/config";
import { ENGLISH_CRAFT_WOOD_TREES_V1 } from "@/lib/live-game/modes/english-craft/map-objects-v1";
import { LIVE_GAME_GROUND_COLOR } from "@/lib/live-game/tiles/grass-tile-pack";

type Props = {
  context: LiveGameSessionContext;
};

function isTreeInteractable(node: LiveGameResourceNodeState | undefined, now = Date.now()) {
  if (!node) return true;
  if (node.cooldownEndsAt != null && node.cooldownEndsAt > now) return false;
  return node.available !== false;
}

export function LiveGameCanvas({ context }: Props) {
  const self = useSelf();
  const { players, selfEntry, session } = useLiveGameLobby();
  const map = getMapForMode(session.mapId, session.modeId);
  const wood = useLiveGameResourcePool();
  const resourceNodes = useLiveGameResourceNodes();
  const [now, setNow] = useState(() => Date.now());
  const roomId = toRoomId(context.sessionId);
  const playerId = self.id;

  const spawnIndex = selfEntry ?
    Math.max(0, players.findIndex((entry) => entry.id === selfEntry.id))
  : 0;

  const challenge = useLiveGameWoodChallenge({
    roomId,
    playerId,
  });

  const movementEnabled = session.phase === "playing" && !challenge.isOpen;
  const cameraRef = useRef<HTMLDivElement>(null);
  const localPlayerRef = useRef<HTMLDivElement>(null);
  const viewport = useViewportSize();

  const { getPosition, sampledPosition, setTouchAxis, facing, isMoving } = useLocalMovement({
    map,
    spawnIndex: spawnIndex >= 0 ? spawnIndex : 0,
    enabled: movementEnabled,
    avatarId: context.avatarId,
    zoom: ENGLISH_CRAFT_MAP_ZOOM,
    viewportW: viewport.w,
    viewportH: viewport.h,
    cameraRef,
    localPlayerRef,
  });

  const interactableTrees = useMemo(
    () =>
      ENGLISH_CRAFT_WOOD_TREES_V1.filter((tree) =>
        isTreeInteractable(resourceNodes[tree.id], now),
      ),
    [now, resourceNodes],
  );

  const interactTarget = useMemo(
    () =>
      findNearestInteractable(
        sampledPosition.x,
        sampledPosition.y,
        interactableTrees,
      ),
    [interactableTrees, sampledPosition.x, sampledPosition.y],
  );

  const handleInteract = useCallback(() => {
    if (challenge.isLoading || challenge.isOpen) return;
    const position = getPosition();
    const target = findNearestInteractable(position.x, position.y, interactableTrees);
    if (!target) return;
    void challenge.beginChallenge(target);
  }, [challenge, getPosition, interactableTrees]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (session.phase !== "playing" || challenge.isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "e" && event.key !== "E") return;
      event.preventDefault();
      handleInteract();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [challenge.isOpen, handleInteract, session.phase]);

  const playerMetaByUserId = useMemo(() => {
    const meta = new Map<string, { name: string; color: string }>();
    for (const entry of players) {
      meta.set(entry.id, { name: entry.player.name, color: entry.player.color });
    }
    return meta;
  }, [players]);

  const remotes = useRemotePlayers(playerMetaByUserId);

  const grassTileWalkers = useMemo((): GrassTileWalker[] => {
    const walkers: GrassTileWalker[] = [
      { id: "local", x: sampledPosition.x, y: sampledPosition.y },
    ];
    for (const remote of remotes) {
      walkers.push({
        id: String(remote.connectionId),
        x: remote.x,
        y: remote.y,
      });
    }
    return walkers;
  }, [sampledPosition.x, sampledPosition.y, remotes]);

  const bouncingTiles = useSteppedGrassTiles(map.tilemap, grassTileWalkers);
  const mapStaticProps = useLiveGameMapStaticProps(map, bouncingTiles, resourceNodes, now);

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
        <div
          ref={cameraRef}
          className="absolute left-0 top-0 will-change-transform"
        >
          <LiveGameMapStatic {...mapStaticProps} />
          <div className="pointer-events-none absolute inset-0 z-30">
            <RemotePlayers map={map} players={remotes} />
            <LocalPlayer
              map={map}
              wrapperRef={localPlayerRef}
              displayName={context.displayName}
              avatarId={context.avatarId}
              facing={facing}
              isMoving={isMoving}
            />
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-20 flex flex-col">
        <header className="pointer-events-auto bg-gradient-to-b from-black/70 via-black/40 to-transparent px-3 pb-8 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-base font-extrabold text-white sm:text-lg">
                {ENGLISH_CRAFT_MODE.title}
              </h1>
              <p className="text-xs font-semibold text-white/80 sm:text-sm">
                Chop trees for team wood — E or Interact
              </p>
            </div>
            <LiveGameTeamHud wood={wood} />
          </div>
          <LiveGameConnectionBanner className="mt-2 rounded-lg border-2 border-amber-300/80 bg-amber-950/90 px-3 py-2 text-sm font-semibold text-amber-100 backdrop-blur-sm" />
        </header>

        <div className="mt-auto flex flex-col gap-3 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
          <LiveGameInteractPrompt
            label={interactTarget ? `Chop ${interactTarget.label}` : "Chop tree"}
            disabled={!interactTarget || challenge.isLoading || session.phase !== "playing"}
            onInteract={handleInteract}
          />
          <div className="pointer-events-auto inline-flex w-fit rounded-2xl border-2 border-white/20 bg-black/45 p-1.5 backdrop-blur-sm">
            <ExploreSceneDpad axisX={0} axisY={0} onAxisChange={setTouchAxis} />
          </div>
        </div>
      </div>

      <LiveGameMcChallengeModal
        open={challenge.isOpen}
        question={challenge.activeChallenge?.question ?? null}
        isSubmitting={challenge.isLoading}
        feedback={challenge.lastResult}
        error={challenge.error}
        onSubmit={(answer) => void challenge.submitAnswer(answer)}
        onClose={challenge.closeChallenge}
      />

      <LiveGameDebugPanel position={sampledPosition} remoteCount={remotes.length} />
    </div>
  );
}
