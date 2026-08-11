import "server-only";

import { LiveObject, toPlainLson, type PlainLsonObject } from "@liveblocks/client";
import { Liveblocks } from "@liveblocks/node";
import type { ActiveActivityRef } from "@/lib/activity-runtime/active-activity-routing";
import { generateJoinCode } from "@/lib/board-game/liveblocks/join-code";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import { setVcActiveActivity } from "@/lib/virtual-classroom/server/liveblocks-session";
import type { VirtualClassroomSessionRecord } from "@/lib/virtual-classroom/domain";
import {
  createWordCardsRoundId,
  DEFAULT_WORD_CARDS_PROMPT,
  DEFAULT_WORD_CARDS_SETTINGS,
  parseWordList,
  toWordCardsRoomId,
  type WordCardsParticipationMode,
  type WordCardsPrompt,
} from "@/lib/word-cards/domain";
import { createWordCardsInitialStorage } from "@/lib/word-cards/liveblocks/initial-storage";
import {
  applyAssignGroupsInStorage,
  ensureParticipantAndCard,
} from "@/lib/word-cards/server/commands";
import {
  getActiveWordCardRoundForSession,
  upsertWordCardRoundMeta,
} from "@/lib/word-cards/server/persistence";
import { getVcSessionGroupsForWordCards } from "@/lib/word-cards/server/vc-groups";

async function getVcActiveActivity(roomId: string): Promise<ActiveActivityRef | null> {
  const liveblocks = getLiveblocksServerClient();
  try {
    const storage = await liveblocks.getStorageDocument(roomId, "json");
    const runtime =
      (storage as { data?: { runtime?: Record<string, unknown> } })?.data?.runtime ??
      (storage as { runtime?: Record<string, unknown> }).runtime;
    const activity = runtime?.activeActivity as ActiveActivityRef | undefined;
    if (!activity || typeof activity !== "object") return null;
    return {
      kind: activity.kind ?? null,
      joinCode: activity.joinCode ?? null,
      label: activity.label ?? null,
      roundId: activity.roundId ?? null,
      roomId: activity.roomId ?? null,
    };
  } catch {
    return null;
  }
}

export type LaunchWordCardsResult = {
  roundId: string;
  roomId: string;
  joinCode: string;
  vcSessionId: string;
  label: string;
  reused: boolean;
  participationMode: WordCardsParticipationMode;
  groupsAssigned: number;
};

export async function launchWordCardsRound(input: {
  session: VirtualClassroomSessionRecord;
  teacher: { userId: string; displayName: string };
  title?: string;
  instructions?: string;
  successCriteria?: string;
  wordList?: string | string[];
  participationMode?: WordCardsParticipationMode;
  timerMinutes?: number;
}): Promise<LaunchWordCardsResult> {
  const existingActivity = await getVcActiveActivity(input.session.liveblocksRoomId);
  if (
    existingActivity?.kind === "word_cards" &&
    existingActivity.joinCode &&
    existingActivity.roomId
  ) {
    await ensureParticipantAndCard({
      roomId: existingActivity.roomId,
      userId: input.teacher.userId,
      displayName: input.teacher.displayName,
      color: "#0f172a",
      role: "host",
    }).catch(() => undefined);
    await setVcActiveActivity({
      roomId: input.session.liveblocksRoomId,
      sessionId: input.session.id,
      classId: input.session.classId,
      actorUserId: input.teacher.userId,
      kind: "word_cards",
      joinCode: existingActivity.joinCode,
      label: existingActivity.label,
      roundId: existingActivity.roundId,
      activityRoomId: existingActivity.roomId,
    }).catch(() => undefined);
    return {
      roundId: existingActivity.roundId ?? `round_${existingActivity.joinCode}`,
      roomId: existingActivity.roomId,
      joinCode: existingActivity.joinCode,
      vcSessionId: input.session.id,
      label: existingActivity.label ?? "Word cards",
      reused: true,
      participationMode: input.participationMode ?? "individual",
      groupsAssigned: 0,
    };
  }

  const fromDb = await getActiveWordCardRoundForSession(input.session.id);
  if (fromDb) {
    await ensureParticipantAndCard({
      roomId: fromDb.liveblocksRoomId,
      userId: input.teacher.userId,
      displayName: input.teacher.displayName,
      color: "#0f172a",
      role: "host",
    }).catch(() => undefined);
    await setVcActiveActivity({
      roomId: input.session.liveblocksRoomId,
      sessionId: input.session.id,
      classId: input.session.classId,
      actorUserId: input.teacher.userId,
      kind: "word_cards",
      joinCode: fromDb.joinCode,
      label: "Word cards",
      roundId: fromDb.id,
      activityRoomId: fromDb.liveblocksRoomId,
    }).catch(() => undefined);
    return {
      roundId: fromDb.id,
      roomId: fromDb.liveblocksRoomId,
      joinCode: fromDb.joinCode,
      vcSessionId: input.session.id,
      label: "Word cards",
      reused: true,
      participationMode: fromDb.participationMode,
      groupsAssigned: 0,
    };
  }

  const wordList = parseWordList(input.wordList);
  if (wordList.length === 0) {
    throw new Error("Add at least one vocabulary word before launching.");
  }

  const secret = assertLiveblocksSecret();
  const joinCode = generateJoinCode();
  const roomId = toWordCardsRoomId(joinCode);
  const roundId = createWordCardsRoundId();
  const timerMinutes =
    typeof input.timerMinutes === "number" && input.timerMinutes > 0
      ? input.timerMinutes
      : 4;
  const participationMode = input.participationMode ?? "individual";
  const prompt: WordCardsPrompt = {
    title: input.title?.trim() || DEFAULT_WORD_CARDS_PROMPT.title,
    instructions: input.instructions?.trim() || DEFAULT_WORD_CARDS_PROMPT.instructions,
    successCriteria:
      input.successCriteria?.trim() || DEFAULT_WORD_CARDS_PROMPT.successCriteria,
  };
  const settings = {
    ...DEFAULT_WORD_CARDS_SETTINGS,
    defaultTimerMs: Math.max(30, timerMinutes) * 60 * 1000,
  };

  const liveblocks = new Liveblocks({ secret });
  await liveblocks.createRoom(roomId, { defaultAccesses: [] });

  const initial = createWordCardsInitialStorage({
    hostUserId: input.teacher.userId,
    roundId,
    joinCode,
    vcSessionId: input.session.id,
    participationMode,
    prompt,
    settings,
    wordList,
    classId: input.session.classId,
  });
  const root = new LiveObject(initial as never);
  const plain = toPlainLson(root) as PlainLsonObject;
  try {
    await liveblocks.initializeStorageDocument(roomId, plain);
  } catch {
    // client may initialize
  }

  await ensureParticipantAndCard({
    roomId,
    userId: input.teacher.userId,
    displayName: input.teacher.displayName,
    color: "#0f172a",
    role: "host",
  });

  let groupsAssigned = 0;
  if (participationMode === "group") {
    const vcGroups = await getVcSessionGroupsForWordCards(input.session.liveblocksRoomId);
    if (vcGroups.length > 0) {
      const liveblocksClient = getLiveblocksServerClient();
      await liveblocksClient.mutateStorage(roomId, ({ root }) => {
        const result = applyAssignGroupsInStorage(root as never, { groups: vcGroups });
        groupsAssigned = result.groupCount;
      });
    }
  }

  await upsertWordCardRoundMeta({
    roundId,
    sessionId: input.session.id,
    joinCode,
    liveblocksRoomId: roomId,
    createdBy: input.teacher.userId,
    participationMode,
    phase: "waiting",
    wordList,
    settings,
  }).catch(() => undefined);

  await setVcActiveActivity({
    roomId: input.session.liveblocksRoomId,
    sessionId: input.session.id,
    classId: input.session.classId,
    actorUserId: input.teacher.userId,
    kind: "word_cards",
    joinCode,
    label: prompt.title,
    roundId,
    activityRoomId: roomId,
  }).catch(() => undefined);

  return {
    roundId,
    roomId,
    joinCode,
    vcSessionId: input.session.id,
    label: prompt.title,
    reused: false,
    participationMode,
    groupsAssigned,
  };
}
