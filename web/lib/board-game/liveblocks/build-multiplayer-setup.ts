import { MIN_PLAYERS } from "@/lib/board-game/constants";
import type { LobbyPlayer } from "@/liveblocks.config";
import { createEmptySetup, SAMPLE_QUESTIONS } from "@/lib/board-game/question-utils";
import type { GameSetup } from "@/lib/board-game/types";

export type LobbyPlayerEntry = {
  id: string;
  player: LobbyPlayer;
};

export function buildMultiplayerSetup(input: {
  storedSetup: GameSetup | null;
  lobbyPlayers: LobbyPlayerEntry[];
}): GameSetup | null {
  const studentPlayers = input.lobbyPlayers
    .filter((entry) => entry.player.role === "player" && entry.player.name.trim().length > 0)
    .map((entry) => ({
      id: entry.id,
      name: entry.player.name.trim(),
      color: entry.player.color,
    }));

  if (studentPlayers.length < MIN_PLAYERS) return null;

  const base = input.storedSetup ?? createEmptySetup(studentPlayers.length);
  const questions = base.questions.length > 0 ? base.questions : SAMPLE_QUESTIONS;
  if (questions.length === 0) return null;

  return {
    ...base,
    schemaVersion: 1,
    playerCount: studentPlayers.length,
    players: studentPlayers,
    questions,
  };
}

export function canStartMultiplayerGame(setup: GameSetup): boolean {
  return (
    setup.players.filter((player) => player.name.trim().length > 0).length >= MIN_PLAYERS &&
    setup.questions.length > 0
  );
}
