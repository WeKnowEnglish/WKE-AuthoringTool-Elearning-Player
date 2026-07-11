"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LiveGameCharacterPickerModal } from "@/components/live-game/LiveGameCharacterPickerModal";
import { LiveGameHostLeaveModal } from "@/components/live-game/LiveGameHostLeaveModal";
import { LiveGameHostLobbyPanel } from "@/components/live-game/LiveGameHostLobbyPanel";
import { LiveGameLobbyNoticeBanner } from "@/components/live-game/LiveGameLobbyNoticeBanner";
import {
  LiveGameMapStage,
  useLiveGameMapStage,
} from "@/components/live-game/LiveGameMapStage";
import {
  LiveGameStudentLobbyBanner,
  LiveGameStudentLobbyFooter,
} from "@/components/live-game/LiveGameStudentLobbyPanel";
import {
  clearLiveGameSessionContext,
  type LiveGameSessionContext,
} from "@/lib/live-game/liveblocks/identity";
import { useAutoJoinLiveGameLobby } from "@/lib/live-game/hooks/useAutoJoinLiveGameLobby";
import { useLiveGameAvatar } from "@/lib/live-game/hooks/useLiveGameAvatar";
import { useLiveGameSessionDuration } from "@/lib/live-game/hooks/useLiveGameSessionDuration";
import { useLiveGameLobby } from "@/lib/live-game/liveblocks/use-live-game-lobby";
import { getMapForMode } from "@/lib/live-game/modes";
import {
  ENGLISH_CRAFT_LOBBY_BRIDGE_CRAFTED,
  ENGLISH_CRAFT_LOBBY_RESOURCE_NODES,
} from "@/lib/live-game/modes/english-craft/lobby-map-v1";
import { getEnglishCraftCollisionRects } from "@/lib/live-game/modes/english-craft/map-v1";
import { canUseUnlimitedLiveGameDuration } from "@/lib/live-game/premium";

type Props = {
  context: LiveGameSessionContext;
};

export function LiveGameLobbyCanvas({ context }: Props) {
  const router = useRouter();
  useAutoJoinLiveGameLobby(context);
  const { self, players, selfEntry, session, isHost, others, startGame, closeLobby } = useLiveGameLobby();
  const { avatarId, setAvatarId, canChangeAvatar, takenAvatarIds } = useLiveGameAvatar(context);
  const { durationMinutes, setDurationMinutes } = useLiveGameSessionDuration(context);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);

  const studentCount = players.filter((entry) => entry.player.role === "player").length;
  const canStart = isHost && studentCount >= 1;
  const canUseUnlimitedDuration = canUseUnlimitedLiveGameDuration(context.userId);

  const baseMap = getMapForMode(session.mapId, session.modeId);

  const spawnIndex = selfEntry ?
    Math.max(0, players.findIndex((entry) => entry.id === selfEntry.id))
  : 0;

  const map = useMemo(
    () => ({
      ...baseMap,
      collisionRects: getEnglishCraftCollisionRects(false),
    }),
    [baseMap],
  );

  const movementEnabled = Boolean(selfEntry) && !pickerOpen && !leaveModalOpen;

  const stage = useLiveGameMapStage({
    map,
    spawnIndex,
    avatarId,
    movementEnabled,
    players,
    visualMode: "lobby",
    resourceNodes: ENGLISH_CRAFT_LOBBY_RESOURCE_NODES,
    bridgeCrafted: ENGLISH_CRAFT_LOBBY_BRIDGE_CRAFTED,
  });

  return (
    <>
      <LiveGameLobbyNoticeBanner notice={session.lobbyNotice} isHost={isHost} />

      <LiveGameMapStage
        map={map}
        stage={stage}
        displayName={context.displayName}
        avatarId={avatarId}
        showDpad
        showDebugPanel={false}
        footer={
          !isHost ?
            <LiveGameStudentLobbyFooter
              playerCount={players.length}
              changeCharacterDisabled={!canChangeAvatar}
              onChangeCharacter={() => setPickerOpen(true)}
            />
          : undefined
        }
      >
        {!isHost ? <LiveGameStudentLobbyBanner /> : null}
      </LiveGameMapStage>

      {isHost ?
        <LiveGameHostLobbyPanel
          joinCode={session.joinCode}
          durationMinutes={durationMinutes}
          onDurationChange={setDurationMinutes}
          canUseUnlimitedDuration={canUseUnlimitedDuration}
          players={players}
          selfId={self.id}
          studentCount={studentCount}
          connectedCount={others.length + 1}
          canStart={canStart}
          onStart={startGame}
          onChangeCharacter={() => setPickerOpen(true)}
          changeCharacterDisabled={!canChangeAvatar}
          onLeaveClick={() => setLeaveModalOpen(true)}
        />
      : null}

      <LiveGameCharacterPickerModal
        open={pickerOpen}
        value={avatarId}
        onChange={setAvatarId}
        onClose={() => setPickerOpen(false)}
        takenAvatarIds={takenAvatarIds}
      />

      <LiveGameHostLeaveModal
        open={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        onLeaveOpen={() => {
          setLeaveModalOpen(false);
          router.push("/live-game");
        }}
        onCloseLobby={() => {
          closeLobby();
          clearLiveGameSessionContext();
          setLeaveModalOpen(false);
          router.push("/live-game");
        }}
      />
    </>
  );
}
