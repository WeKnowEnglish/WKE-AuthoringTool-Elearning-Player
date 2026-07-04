"use client";

import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  RUNTIME_STORAGE_KEY,
  SETUP_STORAGE_KEY,
} from "@/lib/board-game/constants";
import { validateBoardMap } from "@/lib/board-game/map/schema";
import type { BoardPathStyle, GameRuntime, GameSetup, Player, Question } from "@/lib/board-game/types";

function isBoardPathStyle(value: unknown): value is BoardPathStyle {
  return value === "short" || value === "medium" || value === "long";
}

function normalizePlayer(raw: unknown): Player | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Player;
  if (typeof record.id !== "string" || typeof record.name !== "string") return null;
  if (typeof record.color !== "string") return null;
  return {
    id: record.id,
    name: record.name,
    color: record.color,
  };
}

function normalizeQuestion(raw: unknown): Question | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Question;
  if (typeof record.id !== "string") return null;
  if (record.type === "multiple_choice") {
    if (typeof record.prompt !== "string" || !Array.isArray(record.options)) return null;
    if (typeof record.correctAnswer !== "string") return null;
    return record;
  }
  if (record.type === "fill_blank") {
    if (typeof record.sentence !== "string" || typeof record.correctAnswer !== "string") {
      return null;
    }
    return record;
  }
  return null;
}

export function normalizeSetup(raw: unknown): GameSetup | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as GameSetup;
  if (record.schemaVersion !== 1) return null;
  if (typeof record.playerCount !== "number") return null;
  if (!isBoardPathStyle(record.boardPathStyle)) return null;
  if (!Array.isArray(record.players) || !Array.isArray(record.questions)) return null;

  const players = record.players
    .map(normalizePlayer)
    .filter((player): player is Player => player !== null);
  const questions = record.questions
    .map(normalizeQuestion)
    .filter((question): question is Question => question !== null);

  const playerCount = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, record.playerCount));

  return {
    schemaVersion: 1,
    playerCount,
    players: players.slice(0, playerCount),
    boardPathStyle: record.boardPathStyle,
    questions,
    enableLuckySpaces: record.enableLuckySpaces !== false,
    enablePenalties: record.enablePenalties !== false,
    mapId: typeof record.mapId === "string" ? record.mapId : undefined,
    map: record.map ? validateBoardMap(record.map) ?? undefined : undefined,
  };
}

export function normalizeRuntime(raw: unknown): GameRuntime | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as GameRuntime;
  if (typeof record.currentPlayerIndex !== "number") return null;
  if (!Array.isArray(record.playerPositions) || !Array.isArray(record.scores)) return null;
  if (!Array.isArray(record.usedQuestionIds)) return null;
  if (record.turnPhase !== "roll" && record.turnPhase !== "question" && record.turnPhase !== "turnEnd") {
    return null;
  }

  const currentQuestion =
    record.currentQuestion === null ?
      null
    : normalizeQuestion(record.currentQuestion);

  return {
    currentPlayerIndex: record.currentPlayerIndex,
    playerPositions: record.playerPositions,
    scores: record.scores,
    usedQuestionIds: record.usedQuestionIds.filter((id) => typeof id === "string"),
    currentQuestion,
    lastDiceRoll: typeof record.lastDiceRoll === "number" ? record.lastDiceRoll : null,
    turnPhase: record.turnPhase,
    winnerIndex: typeof record.winnerIndex === "number" ? record.winnerIndex : null,
    boardSpaces: Array.isArray(record.boardSpaces) ? record.boardSpaces : [],
    checkpoints: Array.isArray(record.checkpoints) ? record.checkpoints : record.playerPositions.map(() => 0),
    pendingMissTurn: Array.isArray(record.pendingMissTurn) ? record.pendingMissTurn : record.playerPositions.map(() => false),
    pendingRollAgain: record.pendingRollAgain === true,
  };
}

export function readStoredSetup(): GameSetup | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SETUP_STORAGE_KEY);
  if (!raw) return null;
  try {
    return normalizeSetup(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeStoredSetup(setup: GameSetup): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SETUP_STORAGE_KEY, JSON.stringify(setup));
}

export function clearStoredSetup(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SETUP_STORAGE_KEY);
}

export function readStoredRuntime(): GameRuntime | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(RUNTIME_STORAGE_KEY);
  if (!raw) return null;
  try {
    return normalizeRuntime(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeStoredRuntime(runtime: GameRuntime | null): void {
  if (typeof window === "undefined") return;
  if (!runtime) {
    window.localStorage.removeItem(RUNTIME_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(RUNTIME_STORAGE_KEY, JSON.stringify(runtime));
}

export function clearStoredRuntime(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(RUNTIME_STORAGE_KEY);
}
