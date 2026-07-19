import "server-only";

import { LiveObject } from "@liveblocks/client";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import {
  documentIdForGroup,
  documentIdForStudent,
  documentIdForWholeClass,
} from "@/lib/document-activity/domain";
import {
  createDocumentGroupLiveObject,
  createDocumentLiveObject,
} from "@/lib/document-activity/liveblocks/initial-storage";
import type { DocumentRuntimePhase, DocumentWorkStatus } from "@/lib/document-activity/types";
import { upsertDocumentRoundMeta } from "@/lib/document-activity/server/persistence";
import { persistDocumentSubmission } from "@/lib/document-activity/server/submissions";
import { readDocumentYjsContent } from "@/lib/document-activity/server/yjs-content";
import {
  canPushDocumentForReview,
  createDocumentCompareReview,
  createDocumentShowReview,
  revealReviewResults,
  setReviewTaskType,
  submitSharedReviewResponse,
  type DocumentReviewState,
  type DocumentReviewTaskType,
} from "@/lib/document-activity/review";
import {
  canCompareInParticipationMode,
  canSubmitDocumentAsUser,
  findGroupForUser,
  planAssignGroups,
  type AssignGroupsInput,
  type DocumentGroupRecord,
  type GroupSubmitPolicy,
} from "@/lib/document-activity/group-membership";
import { countWords, type DocumentSubmissionType } from "@/lib/document-activity/snapshot";
import type { DocumentRoundSettings } from "@/lib/document-activity/domain";

type StorageRoot = {
  get: (key: string) => unknown;
};

type DocLive = {
  get: (k: string) => unknown;
  set: (k: string, v: unknown) => void;
};

function runtimeOf(root: StorageRoot) {
  return root.get("runtime") as {
    get: (k: string) => unknown;
    set: (k: string, v: unknown) => void;
  };
}

function documentsOf(root: StorageRoot) {
  return root.get("documents") as {
    has: (k: string) => boolean;
    set: (k: string, v: unknown) => void;
    get: (k: string) => DocLive | undefined;
    entries?: () => IterableIterator<[string, DocLive]>;
  };
}

function participantsOf(root: StorageRoot) {
  return root.get("participants") as {
    has: (k: string) => boolean;
    get: (k: string) => DocLive | undefined;
    set: (k: string, v: unknown) => void;
  };
}

function groupsOf(root: StorageRoot) {
  return root.get("groups") as {
    has: (k: string) => boolean;
    get: (k: string) => DocLive | undefined;
    set: (k: string, v: unknown) => void;
    delete: (k: string) => void;
    entries?: () => IterableIterator<[string, DocLive]>;
    keys?: () => IterableIterator<string>;
  } | null;
}

function readGroupRecords(root: StorageRoot): DocumentGroupRecord[] {
  const groups = groupsOf(root);
  if (!groups || typeof groups.entries !== "function") return [];
  const out: DocumentGroupRecord[] = [];
  for (const [id, g] of groups.entries()) {
    out.push({
      id,
      name: String(g.get("name") ?? id),
      memberIds: ((g.get("memberIds") as string[]) ?? []).slice(),
      leaderId: (g.get("leaderId") as string | null) ?? null,
    });
  }
  return out;
}

function existingGroupOwnerIds(documents: ReturnType<typeof documentsOf>): string[] {
  const ids: string[] = [];
  forEachDocument(documents, (_id, doc) => {
    if (doc.get("ownerType") === "group") {
      ids.push(String(doc.get("ownerId") ?? ""));
    }
  });
  return ids.filter(Boolean);
}

function assertReviewPushTarget(storageRoot: StorageRoot, documentId: string): void {
  const documents = documentsOf(storageRoot);
  const doc = documents.get(documentId);
  if (!doc) throw new Error("Document not found.");
  const activeGroupIds = readGroupRecords(storageRoot).map((g) => g.id);
  if (
    !canPushDocumentForReview({
      status: String(doc.get("status") ?? ""),
      ownerType: String(doc.get("ownerType") ?? ""),
      ownerId: String(doc.get("ownerId") ?? ""),
      activeGroupIds,
    })
  ) {
    throw new Error(
      "That document is not ready for class review (or it is an orphaned group).",
    );
  }
}

function playerParticipantIds(storageRoot: StorageRoot): string[] {
  const participants = participantsOf(storageRoot);
  const ids: string[] = [];
  if (typeof (participants as { entries?: unknown }).entries !== "function") return ids;
  for (const [id, p] of (
    participants as unknown as { entries: () => IterableIterator<[string, DocLive]> }
  ).entries()) {
    if (String(p.get("role") ?? "") === "player") ids.push(id);
  }
  return ids;
}

/** Ensure the shared whole-class document exists (idempotent). */
export function ensureWholeClassDocumentInStorage(
  storageRoot: StorageRoot,
  status: DocumentWorkStatus = "waiting",
): string {
  const documents = documentsOf(storageRoot);
  const id = documentIdForWholeClass();
  if (!documents.has(id)) {
    documents.set(
      id,
      createDocumentLiveObject({
        id,
        ownerType: "class",
        ownerId: "class",
        displayName: "Class",
        status,
      }),
    );
  }
  return id;
}

function forEachDocument(
  documents: ReturnType<typeof documentsOf>,
  fn: (id: string, doc: DocLive) => void,
): void {
  if (typeof documents.entries === "function") {
    for (const [id, doc] of documents.entries()) fn(id, doc);
  }
}

export type DocumentTeacherCommand =
  | { type: "OPEN" }
  | { type: "COLLECT" }
  | { type: "ASSIGN_GROUPS"; groups: AssignGroupsInput["groups"] }
  | {
      type: "SHOW";
      documentId: string;
      anonymous?: boolean;
      taskType?: DocumentReviewTaskType;
      prompt?: string;
    }
  | {
      type: "COMPARE";
      documentIds: [string, string];
      anonymous?: boolean;
      taskType?: DocumentReviewTaskType;
      prompt?: string;
    }
  | { type: "CLEAR_SHOW" }
  | { type: "CLEAR_COMPARE" }
  | { type: "SET_REVIEW_TASK"; taskType: DocumentReviewTaskType; prompt?: string }
  | { type: "REVEAL_RESULTS" }
  | { type: "RETURN"; documentIds: string[]; note: string }
  | { type: "REVISE" }
  | { type: "COMPLETE" };

export type DocumentStudentCommand =
  | {
      type: "SUBMIT";
      documentId: string;
      contentJson?: unknown;
      plainText?: string;
      wordCount?: number;
    }
  | { type: "SUBMIT_REVIEW"; choice?: string | null; note?: string }
  | { type: "SET_READY"; ready: boolean };

export async function ensureParticipantAndDocument(input: {
  roomId: string;
  userId: string;
  displayName: string;
  color: string;
  role: "host" | "player";
}): Promise<void> {
  const liveblocks = getLiveblocksServerClient();
  await liveblocks.mutateStorage(input.roomId, ({ root }) => {
    const storageRoot = root as unknown as StorageRoot;
    const participants = participantsOf(storageRoot);
    const groupRecords = readGroupRecords(storageRoot);
    const membership = findGroupForUser(groupRecords, input.userId);

    if (!participants.has(input.userId)) {
      participants.set(
        input.userId,
        new LiveObject({
          name: input.displayName,
          role: input.role,
          joinedAt: Date.now(),
          color: input.color,
          ready: false,
          groupId: membership?.id ?? null,
        }),
      );
    } else {
      const p = participants.get(input.userId);
      if (p) {
        p.set("name", input.displayName);
        p.set("groupId", membership?.id ?? null);
        if (p.get("ready") === undefined) p.set("ready", false);
      }
    }

    const runtime = runtimeOf(storageRoot);
    const mode = runtime.get("participationMode") as string;
    const documents = documentsOf(storageRoot);
    const phase = runtime.get("phase") as DocumentRuntimePhase;
    const activeStatus = phase === "active" || phase === "revision" ? "active" : "waiting";

    // Host still ensures the shared class doc exists at launch/enter.
    if (mode === "whole_class") {
      ensureWholeClassDocumentInStorage(storageRoot, activeStatus);
      return;
    }

    if (input.role !== "player") return;

    if (mode === "individual") {
      const id = documentIdForStudent(input.userId);
      if (!documents.has(id)) {
        documents.set(
          id,
          createDocumentLiveObject({
            id,
            ownerType: "student",
            ownerId: input.userId,
            displayName: input.displayName,
            status: activeStatus,
          }),
        );
      } else {
        const doc = documents.get(id);
        doc?.set("displayName", input.displayName);
      }
      return;
    }

    if (mode === "group" && membership) {
      const id = documentIdForGroup(membership.id);
      if (!documents.has(id)) {
        documents.set(
          id,
          createDocumentLiveObject({
            id,
            ownerType: "group",
            ownerId: membership.id,
            displayName: membership.name,
            status: activeStatus,
          }),
        );
      }
    }
  });
}

/** Apply group assignment + orphan-and-lock inside an open mutateStorage callback. */
export function applyAssignGroupsInStorage(
  storageRoot: StorageRoot,
  incoming: AssignGroupsInput,
): { groupCount: number; orphanCount: number } {
  const groups = groupsOf(storageRoot);
  if (!groups) {
    throw new Error("This document round has no groups map. Start a new document activity.");
  }
  const documents = documentsOf(storageRoot);
  const runtime = runtimeOf(storageRoot);
  const phase = runtime.get("phase") as DocumentRuntimePhase;
  const activeStatus = phase === "active" || phase === "revision" ? "active" : "waiting";

  const plan = planAssignGroups({
    incoming,
    existingGroupOwnerIds: existingGroupOwnerIds(documents),
  });

  runtime.set("participationMode", "group");

  // Remove groups no longer present
  if (typeof groups.keys === "function") {
    for (const key of [...groups.keys()]) {
      if (!plan.groups.some((g) => g.id === key)) {
        groups.delete(key);
      }
    }
  }

  for (const g of plan.groups) {
    groups.set(
      g.id,
      createDocumentGroupLiveObject({
        id: g.id,
        name: g.name,
        memberIds: g.memberIds,
        leaderId: g.leaderId,
      }),
    );
    const docId = documentIdForGroup(g.id);
    if (!documents.has(docId)) {
      documents.set(
        docId,
        createDocumentLiveObject({
          id: docId,
          ownerType: "group",
          ownerId: g.id,
          displayName: g.name,
          status: activeStatus,
        }),
      );
    } else {
      const doc = documents.get(docId);
      if (doc) {
        doc.set("displayName", g.name);
        if (doc.get("status") === "locked") {
          // Reactivated group — unlock into waiting/active for this phase
          doc.set("status", activeStatus);
        }
      }
    }
  }

  for (const ownerId of plan.orphanOwnerIds) {
    const docId = documentIdForGroup(ownerId);
    const doc = documents.get(docId);
    if (doc) doc.set("status", "locked");
  }

  // Refresh participant groupId pointers
  const participants = participantsOf(storageRoot);
  if (typeof (participants as { entries?: unknown }).entries === "function") {
    for (const [userId, p] of (
      participants as unknown as { entries: () => IterableIterator<[string, DocLive]> }
    ).entries()) {
      if (p.get("role") === "host") continue;
      const membership = findGroupForUser(plan.groups, userId);
      p.set("groupId", membership?.id ?? null);
    }
  }

  return { groupCount: plan.groups.length, orphanCount: plan.orphanOwnerIds.length };
}

type PendingSnapshot = {
  documentId: string;
  ownerType: "student" | "group" | "class";
  ownerId: string;
  contributorIds: string[];
  revision: number;
  submissionType: DocumentSubmissionType;
  contentJson?: unknown;
  plainText?: string;
  wordCount?: number;
};

async function persistPendingSnapshots(input: {
  roomId: string;
  roundId: string;
  pending: PendingSnapshot[];
}): Promise<void> {
  for (const item of input.pending) {
    let contentJson: unknown = item.contentJson ?? {};
    let plainText = item.plainText ?? "";
    let wordCount = item.wordCount ?? countWords(plainText);

    if (!item.plainText && !item.contentJson) {
      const fromYjs = await readDocumentYjsContent({
        roomId: input.roomId,
        documentId: item.documentId,
      });
      contentJson = fromYjs.contentJson;
      plainText = fromYjs.plainText;
      wordCount = fromYjs.wordCount;
    }

    await persistDocumentSubmission({
      roundId: input.roundId,
      documentId: item.documentId,
      ownerType: item.ownerType,
      ownerId: item.ownerId,
      contributorIds: item.contributorIds.length ? item.contributorIds : [item.ownerId],
      revision: item.revision,
      submissionType: item.submissionType,
      contentJson,
      plainText,
      wordCount,
    }).catch(() => undefined);
  }
}

async function syncRoundMeta(input: {
  roomId: string;
  roundId: string;
  sessionId: string;
  hostUserId: string;
  phase: DocumentRuntimePhase;
  openedAt?: number | null;
  collectedAt?: number | null;
  completedAt?: number | null;
  participationMode: string;
  templateType: string;
  settings: unknown;
}): Promise<void> {
  await upsertDocumentRoundMeta({
    roundId: input.roundId,
    sessionId: input.sessionId,
    liveblocksRoomId: input.roomId,
    createdBy: input.hostUserId,
    participationMode: input.participationMode as "individual",
    templateType: input.templateType as "paragraph",
    phase: input.phase,
    settings: input.settings,
    openedAt: input.openedAt ? new Date(input.openedAt).toISOString() : undefined,
    collectedAt: input.collectedAt ? new Date(input.collectedAt).toISOString() : undefined,
    completedAt: input.completedAt ? new Date(input.completedAt).toISOString() : undefined,
  }).catch(() => undefined);
}

export async function applyDocumentTeacherCommand(input: {
  roomId: string;
  roundId: string;
  sessionId: string;
  hostUserId: string;
  command: DocumentTeacherCommand;
}): Promise<{ phase: DocumentRuntimePhase }> {
  const liveblocks = getLiveblocksServerClient();
  let phase: DocumentRuntimePhase = "waiting";
  let openedAt: number | null = null;
  let collectedAt: number | null = null;
  let completedAt: number | null = null;
  let participationMode = "individual";
  let templateType = "paragraph";
  let settings: unknown = {};
  const pendingSnapshots: PendingSnapshot[] = [];

  await liveblocks.mutateStorage(input.roomId, ({ root }) => {
    const storageRoot = root as unknown as StorageRoot;
    const runtime = runtimeOf(storageRoot);
    phase = runtime.get("phase") as DocumentRuntimePhase;
    participationMode = String(runtime.get("participationMode") ?? "individual");
    templateType = String(runtime.get("templateType") ?? "paragraph");
    settings = runtime.get("settings") ?? {};
    const documents = documentsOf(storageRoot);

    switch (input.command.type) {
      case "OPEN": {
        if (phase !== "waiting") throw new Error("Open is only available while Waiting.");
        const now = Date.now();
        runtime.set("phase", "active");
        runtime.set("openedAt", now);
        phase = "active";
        openedAt = now;
        forEachDocument(documents, (_id, doc) => {
          if (doc.get("status") === "waiting") doc.set("status", "active");
        });
        break;
      }
      case "ASSIGN_GROUPS": {
        if (phase === "completed") throw new Error("Cannot assign groups after Complete.");
        if (participationMode === "whole_class") {
          throw new Error("Groups are not used in whole-class mode.");
        }
        const result = applyAssignGroupsInStorage(storageRoot, {
          groups: input.command.groups,
        });
        if (result.groupCount === 0) {
          throw new Error("No non-empty groups to assign.");
        }
        break;
      }
      case "COLLECT": {
        if (phase !== "active" && phase !== "revision") {
          throw new Error("Collect is only available during Active or Revision.");
        }
        const now = Date.now();
        runtime.set("phase", "collected");
        runtime.set("collectedAt", now);
        runtime.set("review", null);
        phase = "collected";
        collectedAt = now;
        const classContributors = playerParticipantIds(storageRoot);

        forEachDocument(documents, (id, doc) => {
          const status = String(doc.get("status") ?? "");
          const ownerType = String(doc.get("ownerType") ?? "student") as
            | "student"
            | "group"
            | "class";
          const ownerId = String(doc.get("ownerId") ?? "");
          let revision = Number(doc.get("revision") ?? 1);

          if (
            status === "active" ||
            status === "waiting" ||
            status === "returned" ||
            status === "revising"
          ) {
            revision += 1;
            doc.set("revision", revision);
            doc.set("status", "auto_submitted");
            doc.set("submittedAt", now);
            const contributorIds =
              ownerType === "group"
                ? (readGroupRecords(storageRoot).find((g) => g.id === ownerId)?.memberIds ?? [
                    ownerId,
                  ])
                : ownerType === "class"
                  ? classContributors.length > 0
                    ? classContributors
                    : ["class"]
                  : [ownerId];
            pendingSnapshots.push({
              documentId: id,
              ownerType,
              ownerId,
              contributorIds,
              revision,
              submissionType: "teacher_collect",
            });
          } else if (status === "submitted") {
            doc.set("status", "locked");
          }
        });
        break;
      }
      case "SHOW": {
        if (phase !== "collected" && phase !== "review") {
          throw new Error("Show is available after Collect.");
        }
        const documentId = input.command.documentId;
        assertReviewPushTarget(storageRoot, documentId);
        const anonymous = input.command.anonymous ?? false;
        runtime.set(
          "review",
          createDocumentShowReview({
            documentId,
            anonymous,
            taskType: input.command.taskType,
            prompt: input.command.prompt,
          }),
        );
        runtime.set("phase", "review");
        phase = "review";
        break;
      }
      case "COMPARE": {
        if (phase !== "collected" && phase !== "review") {
          throw new Error("Compare is available after Collect.");
        }
        if (!canCompareInParticipationMode(participationMode)) {
          throw new Error("Compare is not available in whole-class mode. Use Show instead.");
        }
        const [a, b] = input.command.documentIds;
        if (!a || !b || a === b) throw new Error("Compare exactly two different documents.");
        assertReviewPushTarget(storageRoot, a);
        assertReviewPushTarget(storageRoot, b);
        const settingsObj = (settings ?? {}) as { anonymousCompareDefault?: boolean };
        const anonymous = input.command.anonymous ?? settingsObj.anonymousCompareDefault ?? true;
        runtime.set(
          "review",
          createDocumentCompareReview({
            documentIds: [a, b],
            anonymous,
            taskType: input.command.taskType,
            prompt: input.command.prompt,
          }),
        );
        runtime.set("phase", "review");
        phase = "review";
        break;
      }
      case "CLEAR_SHOW":
      case "CLEAR_COMPARE": {
        runtime.set("review", null);
        break;
      }
      case "SET_REVIEW_TASK": {
        const current = runtime.get("review") as DocumentReviewState | null;
        if (!current) throw new Error("Show or Compare a document first.");
        runtime.set(
          "review",
          setReviewTaskType(current, input.command.taskType, input.command.prompt),
        );
        break;
      }
      case "REVEAL_RESULTS": {
        const current = runtime.get("review") as DocumentReviewState | null;
        if (!current) throw new Error("No active review.");
        runtime.set("review", revealReviewResults(current));
        break;
      }
      case "RETURN": {
        if (phase !== "collected" && phase !== "review" && phase !== "revision") {
          throw new Error("Return is available after Collect.");
        }
        const note = input.command.note.trim().slice(0, 280);
        if (!note) throw new Error("Add a short return note.");
        const ids = input.command.documentIds.filter(Boolean);
        if (ids.length === 0) throw new Error("Select at least one document.");

        for (const id of ids) {
          const doc = documents.get(id);
          if (!doc) continue;
          const status = String(doc.get("status") ?? "");
          if (
            status === "submitted" ||
            status === "auto_submitted" ||
            status === "locked" ||
            status === "returned" ||
            status === "revising"
          ) {
            doc.set("status", "returned");
            doc.set("returnNote", note);
          }
        }
        break;
      }
      case "REVISE": {
        if (phase !== "collected" && phase !== "review") {
          throw new Error("Revise starts after Collect.");
        }
        runtime.set("phase", "revision");
        runtime.set("review", null);
        phase = "revision";
        forEachDocument(documents, (_id, doc) => {
          if (doc.get("status") === "returned") {
            doc.set("status", "revising");
          }
        });
        break;
      }
      case "COMPLETE": {
        if (phase === "completed") break;
        const now = Date.now();
        runtime.set("phase", "completed");
        runtime.set("completedAt", now);
        runtime.set("review", null);
        phase = "completed";
        completedAt = now;
        break;
      }
      default:
        throw new Error("Unknown command.");
    }
  });

  await persistPendingSnapshots({
    roomId: input.roomId,
    roundId: input.roundId,
    pending: pendingSnapshots,
  });

  await syncRoundMeta({
    roomId: input.roomId,
    roundId: input.roundId,
    sessionId: input.sessionId,
    hostUserId: input.hostUserId,
    phase,
    openedAt,
    collectedAt,
    completedAt,
    participationMode,
    templateType,
    settings,
  });

  try {
    await liveblocks.broadcastEvent(input.roomId, {
      type: "DOCUMENT_PHASE_CHANGED",
      phase,
    });
  } catch {
    // best-effort
  }

  return { phase };
}

export async function applyDocumentStudentCommand(input: {
  roomId: string;
  roundId: string;
  userId: string;
  command: DocumentStudentCommand;
}): Promise<{ status: DocumentWorkStatus | null; reviewSubmitted?: boolean }> {
  const liveblocks = getLiveblocksServerClient();

  if (input.command.type === "SET_READY") {
    const ready = Boolean(input.command.ready);
    await liveblocks.mutateStorage(input.roomId, ({ root }) => {
      const storageRoot = root as unknown as StorageRoot;
      const participants = participantsOf(storageRoot);
      const p = participants.get(input.userId);
      if (!p) throw new Error("Join the document first.");
      p.set("ready", ready);
    });
    try {
      await liveblocks.broadcastEvent(input.roomId, {
        type: "DOCUMENT_READY_CHANGED",
        userId: input.userId,
        ready,
      });
    } catch {
      // best-effort
    }
    return { status: null };
  }

  if (input.command.type === "SUBMIT_REVIEW") {
    const reviewCommand = input.command;
    await liveblocks.mutateStorage(input.roomId, ({ root }) => {
      const storageRoot = root as unknown as StorageRoot;
      const runtime = runtimeOf(storageRoot);
      const review = runtime.get("review") as DocumentReviewState | null;
      if (!review) throw new Error("No class review is open.");
      if (review.status === "closed") throw new Error("Review is closed.");
      runtime.set(
        "review",
        submitSharedReviewResponse(review, {
          studentId: input.userId,
          choice: reviewCommand.choice,
          note: reviewCommand.note,
        }),
      );
    });
    try {
      await liveblocks.broadcastEvent(input.roomId, {
        type: "DOCUMENT_REVIEW_SUBMITTED",
        userId: input.userId,
      });
    } catch {
      // best-effort
    }
    return { status: null, reviewSubmitted: true };
  }

  const submitCommand = input.command;
  let pending: PendingSnapshot | null = null;
  let status: DocumentWorkStatus | null = null;

  await liveblocks.mutateStorage(input.roomId, ({ root }) => {
    const storageRoot = root as unknown as StorageRoot;
    const runtime = runtimeOf(storageRoot);
    const phase = runtime.get("phase") as DocumentRuntimePhase;
    const review = runtime.get("review") as DocumentReviewState | null;
    if (review) throw new Error("Finish the class review task first.");

    const documents = documentsOf(storageRoot);
    const documentId = submitCommand.documentId;
    const doc = documents.get(documentId);
    if (!doc) throw new Error("Document not found.");

    const ownerType = String(doc.get("ownerType") ?? "student");
    const ownerId = String(doc.get("ownerId") ?? "");
    const groupRecords = readGroupRecords(storageRoot);
    const settingsObj = (runtime.get("settings") as DocumentRoundSettings | null) ?? null;
    const policy = (settingsObj?.groupSubmitPolicy ?? "any_member") as GroupSubmitPolicy;

    const participants = participantsOf(storageRoot);
    const readyMemberIds: string[] = [];
    const group = groupRecords.find((g) => g.id === ownerId);
    if (group && typeof (participants as { entries?: unknown }).entries === "function") {
      for (const [pid, p] of (
        participants as unknown as { entries: () => IterableIterator<[string, DocLive]> }
      ).entries()) {
        if (group.memberIds.includes(pid) && p.get("ready") === true) {
          readyMemberIds.push(pid);
        }
      }
    }

    const gate = canSubmitDocumentAsUser({
      participationMode: String(runtime.get("participationMode") ?? "individual"),
      userId: input.userId,
      documentOwnerType: ownerType,
      documentOwnerId: ownerId,
      groups: groupRecords,
      groupSubmitPolicy: policy,
      readyMemberIds,
    });
    if (!gate.ok) throw new Error(gate.reason ?? "Cannot submit.");

    const currentStatus = String(doc.get("status") ?? "") as DocumentWorkStatus;
    if (phase !== "active" && phase !== "revision") {
      throw new Error("Submit is only available during Active or Revision.");
    }
    if (
      currentStatus === "submitted" ||
      currentStatus === "auto_submitted" ||
      currentStatus === "locked"
    ) {
      throw new Error("Already submitted.");
    }
    if (
      currentStatus !== "active" &&
      currentStatus !== "returned" &&
      currentStatus !== "revising"
    ) {
      throw new Error("Document is not editable.");
    }

    const now = Date.now();
    let revision = Number(doc.get("revision") ?? 1);
    const isResubmit =
      phase === "revision" || currentStatus === "returned" || currentStatus === "revising";
    if (isResubmit) revision += 1;

    doc.set("revision", revision);
    doc.set("status", "submitted");
    doc.set("submittedAt", now);
    status = "submitted";

    // Reset group Ready flags after submit so the next cycle starts clean.
    if (ownerType === "group" && group) {
      for (const memberId of group.memberIds) {
        const p = participants.get(memberId);
        if (p) p.set("ready", false);
      }
    }

    const plainText = (submitCommand.plainText ?? "").trim();
    const snapshotOwnerType =
      ownerType === "group" || ownerType === "class" ? ownerType : "student";
    pending = {
      documentId,
      ownerType: snapshotOwnerType,
      ownerId,
      contributorIds:
        snapshotOwnerType === "group" ? (group?.memberIds ?? [ownerId]) : [input.userId],
      revision,
      submissionType: isResubmit ? "resubmission" : "manual",
      contentJson: submitCommand.contentJson ?? {},
      plainText,
      wordCount:
        typeof submitCommand.wordCount === "number"
          ? submitCommand.wordCount
          : countWords(plainText),
    };
  });

  if (pending) {
    await persistPendingSnapshots({
      roomId: input.roomId,
      roundId: input.roundId,
      pending: [pending],
    });
  }

  try {
    await liveblocks.broadcastEvent(input.roomId, {
      type: "DOCUMENT_SUBMITTED",
      userId: input.userId,
    });
  } catch {
    // best-effort
  }

  return { status };
}
