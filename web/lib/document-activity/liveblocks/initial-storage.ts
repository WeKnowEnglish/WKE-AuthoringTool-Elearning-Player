import { LiveMap, LiveObject } from "@liveblocks/client";
import {
  DEFAULT_DOCUMENT_PROMPT,
  DEFAULT_DOCUMENT_SCAFFOLDS,
  DEFAULT_DOCUMENT_SETTINGS,
  documentIdForWholeClass,
  type DocumentPrompt,
  type DocumentRoundSettings,
  type DocumentScaffolds,
} from "@/lib/document-activity/domain";
import type {
  DocumentFields,
  DocumentGroupFields,
  DocumentParticipant,
  DocumentRuntimeFields,
} from "@/lib/document-activity/liveblocks/types";
import type {
  DocumentParticipationMode,
  DocumentTemplateType,
} from "@/lib/document-activity/types";

export type CreateDocumentStorageInput = {
  hostUserId: string;
  roundId: string;
  vcSessionId: string;
  participationMode?: DocumentParticipationMode;
  templateType?: DocumentTemplateType;
  prompt?: DocumentPrompt;
  scaffolds?: DocumentScaffolds;
  settings?: Partial<DocumentRoundSettings>;
  classId?: string | null;
};

export function createDocumentLiveObject(input: {
  id: string;
  ownerType: DocumentFields["ownerType"];
  ownerId: string;
  displayName: string;
  status?: DocumentFields["status"];
}): LiveObject<DocumentFields> {
  return new LiveObject({
    id: input.id,
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    status: input.status ?? "waiting",
    revision: 1,
    submittedAt: null,
    returnNote: null,
    displayName: input.displayName,
  });
}

export function createDocumentInitialStorage(input: CreateDocumentStorageInput) {
  const settings: DocumentRoundSettings = {
    ...DEFAULT_DOCUMENT_SETTINGS,
    ...input.settings,
  };

  const runtime = new LiveObject<DocumentRuntimeFields>({
    roundId: input.roundId,
    vcSessionId: input.vcSessionId,
    phase: "waiting",
    participationMode: input.participationMode ?? "individual",
    templateType: input.templateType ?? "paragraph",
    prompt: input.prompt ?? { ...DEFAULT_DOCUMENT_PROMPT },
    scaffolds: input.scaffolds ?? {
      wordBank: [...DEFAULT_DOCUMENT_SCAFFOLDS.wordBank],
      sentenceStarters: [...DEFAULT_DOCUMENT_SCAFFOLDS.sentenceStarters],
    },
    settings,
    hostUserId: input.hostUserId,
    review: null,
    classId: input.classId ?? null,
    openedAt: null,
    collectedAt: null,
    completedAt: null,
  });

  const documents = new LiveMap<string, LiveObject<DocumentFields>>();
  if (input.participationMode === "whole_class") {
    const id = documentIdForWholeClass();
    documents.set(
      id,
      createDocumentLiveObject({
        id,
        ownerType: "class",
        ownerId: "class",
        displayName: "Class",
        status: "waiting",
      }),
    );
  }

  return {
    runtime,
    documents,
    participants: new LiveMap<string, LiveObject<DocumentParticipant>>(),
    groups: new LiveMap<string, LiveObject<DocumentGroupFields>>(),
  };
}

export function createDocumentGroupLiveObject(
  input: DocumentGroupFields,
): LiveObject<DocumentGroupFields> {
  return new LiveObject({
    id: input.id,
    name: input.name,
    memberIds: [...input.memberIds],
    leaderId: input.leaderId,
  });
}
