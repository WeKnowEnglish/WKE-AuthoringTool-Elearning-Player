import type { BoardMap } from "@/lib/board-game/map/types";

export type SpaceKind = "normal" | "bonus" | "treasure" | "mystery" | "jump" | "trap";

export type SpaceEffectType =
  | "moveAhead3"
  | "moveBack2"
  | "rollAgain"
  | "stealPoint"
  | "skipTurn"
  | "swapLeader";

export type BoardSpaceMeta = {
  index: number;
  kind: SpaceKind;
  effect: SpaceEffectType;
  label: string;
  emoji: string;
};

export type PenaltyCopy = {
  title: string;
  message: string;
  emoji: string;
};

export type PenaltyType =
  | "back1"
  | "back2"
  | "losePoint"
  | "missTurn"
  | "checkpoint"
  | "start"
  | "rollAgain";

export type UiPhase =
  | "ready"
  | "diceRolling"
  | "moving"
  | "landing"
  | "luckySpace"
  | "shortcut"
  | "question"
  | "celebrating"
  | "penalty"
  | "turnHandoff"
  | "victory";

export type BoardPathStyle = "short" | "medium" | "long";

export type Player = {
  id: string;
  name: string;
  color: string;
};

export type MultipleChoiceQuestion = {
  id: string;
  type: "multiple_choice";
  prompt: string;
  options: string[];
  correctAnswer: string;
};

export type FillBlankQuestion = {
  id: string;
  type: "fill_blank";
  sentence: string;
  correctAnswer: string;
};

export type Question = MultipleChoiceQuestion | FillBlankQuestion;

export type GameSetup = {
  schemaVersion: 1;
  playerCount: number;
  players: Player[];
  boardPathStyle: BoardPathStyle;
  questions: Question[];
  enableLuckySpaces?: boolean;
  enablePenalties?: boolean;
  /** Reference to a saved or built-in map (Phase 1+). */
  mapId?: string;
  /** Embedded custom map overrides mapId and boardPathStyle defaults. */
  map?: BoardMap;
};

export type TurnPhase = "roll" | "question" | "turnEnd";

export type GameRuntime = {
  currentPlayerIndex: number;
  playerPositions: number[];
  scores: number[];
  usedQuestionIds: string[];
  currentQuestion: Question | null;
  lastDiceRoll: number | null;
  turnPhase: TurnPhase;
  winnerIndex: number | null;
  boardSpaces: BoardSpaceMeta[];
  checkpoints: number[];
  pendingMissTurn: boolean[];
  pendingRollAgain: boolean;
};
