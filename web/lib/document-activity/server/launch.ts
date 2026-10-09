import "server-only";

import { LiveObject, toPlainLson, type PlainLsonObject } from "@liveblocks/client";
import { Liveblocks } from "@liveblocks/node";
import {
  createRoundId,
  defaultPromptForTemplate,
  defaultScaffoldsForTemplate,
  DEFAULT_DOCUMENT_SETTINGS,
  toDocumentRoomId,
  type DocumentPrompt,
  type DocumentScaffolds,
} from "@/lib/document-activity/domain";
import { createDocumentInitialStorage } from "@/lib/document-activity/liveblocks/initial-storage";
import {
  getActiveDocumentRoundForSession,
  upsertDocumentRoundMeta,
} from "@/lib/document-activity/server/persistence";
import {
  applyAssignGroupsInStorage,
  ensureParticipantAndDocument,
} from "@/lib/document-activity/server/commands";
import { getVcSessionGroups } from "@/lib/document-activity/server/vc-groups";
import { sessionGroupsToDocumentAssign } from "@/lib/document-activity/group-membership";
import type { DocumentGroupSubmitPolicy } from "@/lib/document-activity/domain";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import { setVcActiveActivity } from "@/lib/virtual-classroom/server/liveblocks-session";
import type { VirtualClassroomSessionRecord } from "@/lib/virtual-classroom/domain";
import type {
  DocumentParticipationMode,
  DocumentTemplateType,
} from "@/lib/document-activity/types";

export type LaunchDocumentResult = {
  roundId: string;
  roomId: string;
  vcSessionId: string;
  joinCode: string;
  label: string;
  reused: boolean;
  participationMode: DocumentParticipationMode;
  groupsAssigned: number;
};

export async function launchDocumentRound(input: {
  session: VirtualClassroomSessionRecord;
  teacher: { userId: string; displayName: string };
  title?: string;
  instructions?: string;
  successCriteria?: string;
  stimulus?: string;
  templateType?: DocumentTemplateType;
  participationMode?: DocumentParticipationMode;
  groupSubmitPolicy?: DocumentGroupSubmitPolicy;
  timerMinutes?: number;
  wordBank?: string[];
  sentenceStarters?: string[];
}): Promise<LaunchDocumentResult> {
  if (input.session.status !== "active" || input.session.createdBy !== input.teacher.userId) {
    throw new Error("Current classroom host access is required.");
  }
  const fromDb = await getActiveDocumentRoundForSession(input.session.id);
  if (fromDb) {
    if (fromDb.createdBy !== input.teacher.userId) throw new Error("This activity belongs to another teacher.");
    await ensureParticipantAndDocument({ roomId: fromDb.liveblocksRoomId,
      userId: input.teacher.userId, displayName: input.teacher.displayName, color: "#0f172a", role: "host" });
    await setVcActiveActivity({
      roomId: input.session.liveblocksRoomId,
      sessionId: input.session.id,
      classId: input.session.classId,
      actorUserId: input.teacher.userId,
      kind: "document",
      joinCode: fromDb.id,
      label: "Document activity",
      roundId: fromDb.id,
      activityRoomId: fromDb.liveblocksRoomId,
    });
    return {
      roundId: fromDb.id,
      roomId: fromDb.liveblocksRoomId,
      vcSessionId: input.session.id,
      joinCode: fromDb.id,
      label: "Document activity",
      reused: true,
      participationMode: fromDb.participationMode,
      groupsAssigned: 0,
    };
  }

  const secret = assertLiveblocksSecret();
  const roundId = createRoundId();
  const roomId = toDocumentRoomId(input.session.id, roundId);
  const templateType = input.templateType ?? "paragraph";
  const participationMode = input.participationMode ?? "individual";
  const defaults = defaultPromptForTemplate(templateType);
  const prompt: DocumentPrompt = {
    title: input.title?.trim() || defaults.title,
    instructions: input.instructions?.trim() || defaults.instructions,
    successCriteria: input.successCriteria?.trim() || defaults.successCriteria,
    stimulus: (input.stimulus ?? defaults.stimulus ?? "").trim(),
  };
  const scaffoldDefaults = defaultScaffoldsForTemplate(templateType);
  const scaffolds: DocumentScaffolds = {
    wordBank: input.wordBank?.length ? input.wordBank : [...scaffoldDefaults.wordBank],
    sentenceStarters: input.sentenceStarters?.length
      ? input.sentenceStarters
      : [...scaffoldDefaults.sentenceStarters],
  };
  const timerMinutes =
    typeof input.timerMinutes === "number" && input.timerMinutes > 0 ? input.timerMinutes : 5;
  const settings = {
    ...DEFAULT_DOCUMENT_SETTINGS,
    defaultTimerMs: timerMinutes * 60 * 1000,
    groupSubmitPolicy: input.groupSubmitPolicy ?? DEFAULT_DOCUMENT_SETTINGS.groupSubmitPolicy,
  };

  const liveblocks = new Liveblocks({ secret });
  await liveblocks.createRoom(roomId, { defaultAccesses: [] });

  const initial = createDocumentInitialStorage({
    hostUserId: input.teacher.userId,
    roundId,
    vcSessionId: input.session.id,
    participationMode,
    templateType,
    prompt,
    scaffolds,
    settings,
    classId: input.session.classId,
  });

  const root = new LiveObject(initial);
  const plain = toPlainLson(root) as PlainLsonObject;
  await liveblocks.initializeStorageDocument(roomId, plain);

  await upsertDocumentRoundMeta({
    create: true,
    roundId,
    sessionId: input.session.id,
    liveblocksRoomId: roomId,
    createdBy: input.teacher.userId,
    participationMode,
    templateType,
    phase: "waiting",
    settings: { ...settings, prompt, scaffolds },
  });

  await ensureParticipantAndDocument({
    roomId,
    userId: input.teacher.userId,
    displayName: input.teacher.displayName,
    color: "#0f172a",
    role: "host",
  });

  let groupsAssigned = 0;
  if (participationMode === "group") {
    const vcGroups = await getVcSessionGroups(input.session.liveblocksRoomId);
    if (vcGroups.length > 0) {
      const assign = sessionGroupsToDocumentAssign(vcGroups);
      const liveblocksClient = getLiveblocksServerClient();
      await liveblocksClient.mutateStorage(roomId, ({ root }) => {
        const result = applyAssignGroupsInStorage(root as never, assign);
        groupsAssigned = result.groupCount;
      });
    }
  }

  await setVcActiveActivity({
    roomId: input.session.liveblocksRoomId,
    sessionId: input.session.id,
    classId: input.session.classId,
    actorUserId: input.teacher.userId,
    kind: "document",
    joinCode: roundId,
    label: prompt.title,
    roundId,
    activityRoomId: roomId,
  });

  return {
    roundId,
    roomId,
    vcSessionId: input.session.id,
    joinCode: roundId,
    label: prompt.title,
    reused: false,
    participationMode,
    groupsAssigned,
  };
}
