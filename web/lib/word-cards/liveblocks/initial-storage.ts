import { LiveMap, LiveObject } from "@liveblocks/client";
import {
  DEFAULT_WORD_CARDS_PROMPT,
  DEFAULT_WORD_CARDS_SETTINGS,
  type WordCardsParticipationMode,
  type WordCardsPrompt,
  type WordCardsRoundSettings,
} from "@/lib/word-cards/domain";
import type {
  WordCardsCardFields,
  WordCardsParticipant,
  WordCardsRuntimeFields,
} from "@/lib/word-cards/liveblocks/types";

export type CreateWordCardsStorageInput = {
  hostUserId: string;
  roundId: string;
  joinCode: string;
  vcSessionId: string;
  participationMode?: WordCardsParticipationMode;
  prompt?: WordCardsPrompt;
  settings?: Partial<WordCardsRoundSettings>;
  wordList?: string[];
  classId?: string | null;
};

export function createEmptyDrawing(): WordCardsCardFields["drawing"] {
  return { strokes: [] };
}

export function createWordCardLiveObject(input: {
  id: string;
  ownerType: WordCardsCardFields["ownerType"];
  ownerId: string;
  displayName: string;
  assignedWord?: string;
  status?: WordCardsCardFields["status"];
}): LiveObject<WordCardsCardFields> {
  return new LiveObject({
    id: input.id,
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    displayName: input.displayName,
    assignedWord: input.assignedWord ?? "",
    definition: "",
    exampleSentence: "",
    drawing: createEmptyDrawing(),
    status: input.status ?? "waiting",
    moderation: "none",
    revision: 1,
    submittedAt: null,
    returnNote: null,
  });
}

export function createWordCardsInitialStorage(input: CreateWordCardsStorageInput) {
  const settings: WordCardsRoundSettings = {
    ...DEFAULT_WORD_CARDS_SETTINGS,
    ...input.settings,
  };

  const runtime = new LiveObject<WordCardsRuntimeFields>({
    roundId: input.roundId,
    joinCode: input.joinCode.toUpperCase(),
    vcSessionId: input.vcSessionId,
    phase: "waiting",
    participationMode: input.participationMode ?? "individual",
    prompt: input.prompt ?? { ...DEFAULT_WORD_CARDS_PROMPT },
    settings,
    wordList: [...(input.wordList ?? [])],
    hostUserId: input.hostUserId,
    classId: input.classId ?? null,
    review: null,
    play: null,
    openedAt: null,
    collectedAt: null,
    completedAt: null,
  });

  return {
    runtime,
    cards: new LiveMap<string, LiveObject<WordCardsCardFields>>(),
    participants: new LiveMap<string, LiveObject<WordCardsParticipant>>(),
    groups: new LiveMap<
      string,
      LiveObject<{
        id: string;
        name: string;
        memberIds: string[];
        leaderId: string | null;
      }>
    >(),
    submissions: new LiveMap<string, LiveObject<{ id: string }>>(),
  };
}
