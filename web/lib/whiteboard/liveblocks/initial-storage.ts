import { LiveList, LiveMap, LiveObject } from "@liveblocks/client";
import {
  boardIdForScope,
  createIdleTimer,
  DEFAULT_SETTINGS,
  EMPTY_BACKGROUND,
  type BoardBackground,
  type WhiteboardMode,
  type WhiteboardPrompt,
  type WhiteboardSettings,
} from "@/lib/whiteboard/domain";
import type {
  WhiteboardBoardFields,
  WhiteboardGroup,
  WhiteboardParticipant,
  WhiteboardRuntimeFields,
  WhiteboardSubmissionRecord,
} from "@/lib/whiteboard/liveblocks/types";

export type CreateWhiteboardStorageInput = {
  hostUserId: string;
  joinCode: string;
  roundId: string;
  mode?: WhiteboardMode;
  prompt?: WhiteboardPrompt;
  settings?: Partial<WhiteboardSettings>;
  background?: BoardBackground;
  stampPackId?: string;
  classId?: string | null;
  sessionId?: string | null;
  productMode?: boolean;
};

export function createWhiteboardInitialStorage(input: CreateWhiteboardStorageInput) {
  const settings: WhiteboardSettings = {
    ...DEFAULT_SETTINGS,
    ...input.settings,
  };
  const prompt: WhiteboardPrompt = input.prompt ?? {
    title: "Whiteboard activity",
    instructions: "Wait for your teacher to open the boards.",
  };

  const runtime = new LiveObject<WhiteboardRuntimeFields>({
    roundId: input.roundId,
    phase: "WAITING",
    mode: input.mode ?? "individual",
    timer: createIdleTimer(settings.defaultTimerMs),
    prompt,
    settings,
    joinCode: input.joinCode,
    hostUserId: input.hostUserId,
    displayBoardId: null,
    displayAnonymous: false,
    compareBoardIds: null,
    compareAnonymous: false,
    review: null,
    reviewTask: null,
    background: input.background ?? EMPTY_BACKGROUND,
    promptVersion: 1,
    stampPackId: input.stampPackId ?? "default",
    classId: input.classId ?? null,
    sessionId: input.sessionId ?? null,
    productMode: input.productMode ?? false,
  });

  const boards = new LiveMap<string, LiveObject<WhiteboardBoardFields>>();
  const teacherBoardId = boardIdForScope({ type: "teacher" });
  boards.set(
    teacherBoardId,
    createBoardLiveObject({
      id: teacherBoardId,
      ownerType: "teacher",
      ownerId: input.hostUserId,
    }),
  );

  return {
    runtime,
    boards,
    participants: new LiveMap<string, LiveObject<WhiteboardParticipant>>(),
    groups: new LiveMap<string, LiveObject<WhiteboardGroup>>(),
    submissions: new LiveMap<string, LiveObject<WhiteboardSubmissionRecord>>(),
  };
}

export function createBoardLiveObject(input: {
  id: string;
  ownerType: WhiteboardBoardFields["ownerType"];
  ownerId: string;
}): LiveObject<WhiteboardBoardFields> {
  return new LiveObject({
    id: input.id,
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    status: "WAITING",
    revision: 1,
    submittedAt: null,
    privateHint: null,
    elements: new LiveMap(),
    zOrder: new LiveList<string>([]),
    annotations: new LiveMap(),
    annotationZOrder: new LiveList<string>([]),
    previewDataUrl: null,
  });
}
