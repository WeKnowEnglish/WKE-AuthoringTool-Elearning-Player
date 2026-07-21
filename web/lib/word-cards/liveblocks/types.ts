import type {
  WordCardsModeration,
  WordCardsParticipationMode,
  WordCardsPrompt,
  WordCardsRoundSettings,
  WordCardsRuntimePhase,
  WordCardsWorkStatus,
} from "@/lib/word-cards/domain";
import type { WordCardsPlayState } from "@/lib/word-cards/play";
import type { WordCardsReviewState } from "@/lib/word-cards/review";

export type { WordCardsPlayState, WordCardsPlayStatus, WordCardsPlayAnswer } from "@/lib/word-cards/play";
export type { WordCardsReviewState } from "@/lib/word-cards/review";

export type WordCardsAuthRole = "host" | "player";

/** JSON-safe mini-canvas strokes (WC-2). */
export type WordCardsStroke = {
  id: string;
  color: string;
  width: number;
  points: Array<{ x: number; y: number }>;
};

export type WordCardsDrawing = {
  strokes: WordCardsStroke[];
};

export const WORD_CARD_CANVAS_WIDTH = 480;
export const WORD_CARD_CANVAS_HEIGHT = 220;

export type WordCardsCardFields = {
  id: string;
  ownerType: "student" | "group";
  ownerId: string;
  displayName: string;
  assignedWord: string;
  definition: string;
  exampleSentence: string;
  drawing: WordCardsDrawing;
  status: WordCardsWorkStatus;
  moderation: WordCardsModeration;
  revision: number;
  submittedAt: number | null;
  returnNote: string | null;
};

export type WordCardsParticipant = {
  name: string;
  role: WordCardsAuthRole;
  joinedAt: number;
  color: string;
  ready: boolean;
  groupId: string | null;
};

export type WordCardsRuntimeFields = {
  roundId: string;
  joinCode: string;
  vcSessionId: string;
  phase: WordCardsRuntimePhase;
  participationMode: WordCardsParticipationMode;
  prompt: WordCardsPrompt;
  settings: WordCardsRoundSettings;
  wordList: string[];
  hostUserId: string;
  classId: string | null;
  review: WordCardsReviewState | null;
  play: WordCardsPlayState | null;
  openedAt: number | null;
  collectedAt: number | null;
  completedAt: number | null;
};

export const DEFAULT_WORD_CARDS_PRESENCE = {
  displayName: "Guest",
  role: "player" as WordCardsAuthRole,
  clientInstanceId: "",
  cursor: null as null | { x: number; y: number },
};
