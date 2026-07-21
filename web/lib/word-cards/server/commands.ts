import "server-only";

import { LiveObject } from "@liveblocks/client";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import type { ActivityGroupSubmitPolicy } from "@/lib/collaborative-activity/domain";
import {
  assignWordsRoundRobin,
  cardIdForGroup,
  cardIdForStudent,
  DEFAULT_WORD_CARDS_SETTINGS,
  type WordCardsRoundSettings,
  type WordCardsRuntimePhase,
} from "@/lib/word-cards/domain";
import {
  canSubmitWordCardAsUser,
  findWordCardsGroupForUser,
  planAssignWordCardsGroups,
  type AssignWordCardsGroupsInput,
  type WordCardsGroupRecord,
} from "@/lib/word-cards/group-membership";
import { createWordCardLiveObject } from "@/lib/word-cards/liveblocks/initial-storage";
import {
  buildPlayItem,
  canStartDefinitionRace,
  listApprovedPlayableCards,
  pickNextPromptCard,
  type ApprovedDeckCard,
  type WordCardsPlayState,
} from "@/lib/word-cards/play";
import {
  canPushCardForReview,
  createWordCardsCompareReview,
  createWordCardsShowReview,
  revealReviewResults,
  setReviewTaskType,
  submitSharedReviewResponse,
  type WordCardsReviewState,
  type WordCardsReviewTaskType,
} from "@/lib/word-cards/review";
import {
  persistWordCardSubmission,
  upsertWordCardRoundMeta,
  type WordCardSubmissionType,
} from "@/lib/word-cards/server/persistence";

type MutatorNode = {
  get: (key: string) => unknown;
  set: (key: string, value: unknown) => void;
};

type MutatorMap = {
  get: (key: string) => MutatorNode | undefined;
  set: (key: string, value: unknown) => void;
  has: (key: string) => boolean;
  delete?: (key: string) => void;
  keys?: () => IterableIterator<string>;
  entries: () => IterableIterator<[string, MutatorNode]>;
};

type StorageRoot = {
  get: (key: string) => unknown;
};

type PendingSnapshot = {
  cardId: string;
  ownerType: string;
  ownerId: string;
  revision: number;
  submissionType: WordCardSubmissionType;
  assignedWord: string;
  definition: string;
  exampleSentence: string;
  drawing: unknown;
};

function runtimeOf(root: StorageRoot): MutatorNode {
  return root.get("runtime") as MutatorNode;
}

function cardsOf(root: StorageRoot): MutatorMap {
  return root.get("cards") as MutatorMap;
}

function participantsOf(root: StorageRoot): MutatorMap {
  return root.get("participants") as MutatorMap;
}

function groupsOf(root: StorageRoot): MutatorMap {
  return root.get("groups") as MutatorMap;
}

function existingGroupOwnerIds(cards: MutatorMap): string[] {
  const ids: string[] = [];
  for (const [, card] of cards.entries()) {
    if (card.get("ownerType") === "group") {
      ids.push(String(card.get("ownerId") ?? ""));
    }
  }
  return ids.filter(Boolean);
}

function readGroupRecords(groups: MutatorMap): WordCardsGroupRecord[] {
  const out: WordCardsGroupRecord[] = [];
  for (const [id, g] of groups.entries()) {
    out.push({
      id,
      name: String(g.get("name") ?? id),
      memberIds: [...((g.get("memberIds") as string[] | undefined) ?? [])],
      leaderId: (g.get("leaderId") as string | null) ?? null,
    });
  }
  return out;
}

function activeGroupIdsOf(groups: MutatorMap): string[] {
  return [...groups.entries()].map(([id]) => id);
}

function readyMemberIdsOf(participants: MutatorMap, memberIds: string[]): string[] {
  return memberIds.filter((id) => {
    const p = participants.get(id);
    return Boolean(p?.get("ready"));
  });
}

export function applyAssignGroupsInStorage(
  storageRoot: StorageRoot,
  incoming: AssignWordCardsGroupsInput,
): { groupCount: number; orphanCount: number } {
  const groups = groupsOf(storageRoot);
  const cards = cardsOf(storageRoot);
  const participants = participantsOf(storageRoot);
  const runtime = runtimeOf(storageRoot);
  const phase = String(runtime.get("phase") ?? "waiting") as WordCardsRuntimePhase;
  const wordList = (runtime.get("wordList") as string[] | undefined) ?? [];
  const activeStatus =
    phase === "active" || phase === "revision" ? "active" : "waiting";

  const plan = planAssignWordCardsGroups({
    incoming,
    existingGroupOwnerIds: existingGroupOwnerIds(cards),
  });

  runtime.set("participationMode", "group");

  if (typeof groups.keys === "function" && typeof groups.delete === "function") {
    for (const key of [...groups.keys()]) {
      if (!plan.groups.some((g) => g.id === key)) {
        groups.delete(key);
      }
    }
  }

  const groupIds = plan.groups.map((g) => g.id).sort();
  const assigned =
    phase === "active" || phase === "revision"
      ? assignWordsRoundRobin({ wordList, studentIds: groupIds })
      : {};

  for (const g of plan.groups) {
    groups.set(
      g.id,
      new LiveObject({
        id: g.id,
        name: g.name,
        memberIds: g.memberIds,
        leaderId: g.leaderId,
      }),
    );
    const cardId = cardIdForGroup(g.id);
    if (!cards.has(cardId)) {
      cards.set(
        cardId,
        createWordCardLiveObject({
          id: cardId,
          ownerType: "group",
          ownerId: g.id,
          displayName: g.name,
          assignedWord: assigned[g.id] ?? "",
          status: activeStatus,
        }),
      );
    } else {
      const card = cards.get(cardId);
      if (card) {
        card.set("displayName", g.name);
        if (card.get("status") === "locked") {
          card.set("status", activeStatus);
        }
        if (
          (phase === "active" || phase === "revision") &&
          !String(card.get("assignedWord") ?? "")
        ) {
          card.set("assignedWord", assigned[g.id] ?? wordList[0] ?? "");
        }
      }
    }
  }

  for (const ownerId of plan.orphanOwnerIds) {
    const card = cards.get(cardIdForGroup(ownerId));
    if (card) card.set("status", "locked");
  }

  for (const [userId, p] of participants.entries()) {
    if (p.get("role") === "host") continue;
    const membership = findWordCardsGroupForUser(plan.groups, userId);
    p.set("groupId", membership?.id ?? null);
    if (!membership) p.set("ready", false);
  }

  return { groupCount: plan.groups.length, orphanCount: plan.orphanOwnerIds.length };
}

function snapshotFromCard(
  cardId: string,
  card: MutatorNode,
  submissionType: WordCardSubmissionType,
): PendingSnapshot {
  return {
    cardId,
    ownerType: String(card.get("ownerType") ?? "student"),
    ownerId: String(card.get("ownerId") ?? ""),
    revision: Number(card.get("revision") ?? 1),
    submissionType,
    assignedWord: String(card.get("assignedWord") ?? ""),
    definition: String(card.get("definition") ?? ""),
    exampleSentence: String(card.get("exampleSentence") ?? ""),
    drawing: card.get("drawing") ?? { strokes: [] },
  };
}

export type WordCardsTeacherCommand =
  | { type: "OPEN" }
  | { type: "ASSIGN_GROUPS"; groups: AssignWordCardsGroupsInput["groups"] }
  | { type: "COLLECT" }
  | { type: "RETURN"; cardIds: string[]; note: string }
  | { type: "REVISE" }
  | { type: "APPROVE_CARD"; cardIds: string[] }
  | {
      type: "EDIT_CARD";
      cardId: string;
      definition?: string;
      exampleSentence?: string;
    }
  | {
      type: "SHOW";
      cardId: string;
      anonymous?: boolean;
      taskType?: WordCardsReviewTaskType;
      prompt?: string;
    }
  | {
      type: "COMPARE";
      cardIds: [string, string];
      anonymous?: boolean;
      taskType?: WordCardsReviewTaskType;
      prompt?: string;
    }
  | { type: "CLEAR_SHOW" }
  | { type: "CLEAR_COMPARE" }
  | {
      type: "SET_REVIEW_TASK";
      taskType: WordCardsReviewTaskType;
      prompt?: string;
    }
  | { type: "REVEAL_RESULTS" }
  | { type: "START_PLAY" }
  | { type: "NEXT_PLAY_ITEM" }
  | { type: "LOCK_PLAY_ANSWERS" }
  | { type: "REVEAL_PLAY_RESULTS" }
  | { type: "END_PLAY" }
  | { type: "COMPLETE" };

const MODERATION_PHASES = new Set<WordCardsRuntimePhase>([
  "collected",
  "review",
  "revision",
  "moderating",
]);

const REVIEW_PUSH_PHASES = new Set<WordCardsRuntimePhase>([
  "collected",
  "review",
  "moderating",
]);

const START_PLAY_PHASES = new Set<WordCardsRuntimePhase>([
  "collected",
  "review",
  "moderating",
]);

export type WordCardsStudentCommand =
  | { type: "SUBMIT"; cardId: string }
  | { type: "SELECT_PLAY_ANSWER"; selectedWord: string }
  | { type: "SUBMIT_REVIEW"; choice?: string | null; note?: string }
  | { type: "SET_READY"; ready: boolean };

function assertReviewPushTarget(
  cards: MutatorMap,
  groups: MutatorMap,
  cardId: string,
): void {
  const card = cards.get(cardId);
  if (!card) throw new Error("Card not found.");
  if (
    !canPushCardForReview({
      status: String(card.get("status") ?? ""),
      ownerType: String(card.get("ownerType") ?? ""),
      ownerId: String(card.get("ownerId") ?? ""),
      activeGroupIds: activeGroupIdsOf(groups),
    })
  ) {
    throw new Error("That card is not ready for Show / Compare.");
  }
}

function readReviewState(runtime: MutatorNode): WordCardsReviewState | null {
  const review = runtime.get("review");
  if (!review || typeof review !== "object") return null;
  return review as WordCardsReviewState;
}

function readApprovedDeckCards(cards: MutatorMap): ApprovedDeckCard[] {
  const out: ApprovedDeckCard[] = [];
  for (const [id, card] of cards.entries()) {
    if (card.get("ownerType") === "teacher") continue;
    out.push({
      id,
      assignedWord: String(card.get("assignedWord") ?? ""),
      definition: String(card.get("definition") ?? ""),
      moderation: String(card.get("moderation") ?? "none"),
    });
  }
  return out;
}

function readPlayState(runtime: MutatorNode): WordCardsPlayState | null {
  const play = runtime.get("play");
  if (!play || typeof play !== "object") return null;
  return play as WordCardsPlayState;
}

export async function ensureParticipantAndCard(input: {
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
    const runtime = runtimeOf(storageRoot);
    const phase = String(runtime.get("phase") ?? "waiting") as WordCardsRuntimePhase;
    const mode = String(runtime.get("participationMode") ?? "individual");

    if (!participants.has(input.userId)) {
      participants.set(
        input.userId,
        new LiveObject({
          name: input.displayName,
          role: input.role,
          joinedAt: Date.now(),
          color: input.color,
          ready: false,
          groupId: null,
        }),
      );
    } else {
      const p = participants.get(input.userId);
      p?.set("name", input.displayName);
    }

    if (input.role !== "player" || mode !== "individual") return;

    const cards = cardsOf(storageRoot);
    const cardId = cardIdForStudent(input.userId);
    if (!cards.has(cardId)) {
      const wordList = (runtime.get("wordList") as string[] | undefined) ?? [];
      let assignedWord = "";
      if (phase === "active" || phase === "revision") {
        const playerIds = [...participants.entries()]
          .filter(([, p]) => p.get("role") === "player")
          .map(([id]) => id)
          .sort();
        const assigned = assignWordsRoundRobin({ wordList, studentIds: playerIds });
        assignedWord = assigned[input.userId] ?? wordList[0] ?? "";
      }
      cards.set(
        cardId,
        createWordCardLiveObject({
          id: cardId,
          ownerType: "student",
          ownerId: input.userId,
          displayName: input.displayName,
          assignedWord,
          status: phase === "waiting" ? "waiting" : "active",
        }),
      );
    }
  });
}

export async function applyWordCardsTeacherCommand(input: {
  roomId: string;
  roundId: string;
  sessionId: string;
  hostUserId: string;
  command: WordCardsTeacherCommand;
}): Promise<{ phase: WordCardsRuntimePhase }> {
  const liveblocks = getLiveblocksServerClient();
  let phase: WordCardsRuntimePhase = "waiting";
  let participationMode = "individual";
  let wordList: string[] = [];
  let settings: unknown = {};
  let joinCode = "";
  let openedAt: string | null | undefined;
  let collectedAt: string | null | undefined;
  let completedAt: string | null | undefined;
  const pending: PendingSnapshot[] = [];

  await liveblocks.mutateStorage(input.roomId, ({ root }) => {
    const storageRoot = root as unknown as StorageRoot;
    const runtime = runtimeOf(storageRoot);
    phase = runtime.get("phase") as WordCardsRuntimePhase;
    participationMode = String(runtime.get("participationMode") ?? "individual");
    wordList = (runtime.get("wordList") as string[] | undefined) ?? [];
    settings = runtime.get("settings") ?? {};
    joinCode = String(runtime.get("joinCode") ?? "");
    const cards = cardsOf(storageRoot);
    const participants = participantsOf(storageRoot);
    const groups = groupsOf(storageRoot);

    switch (input.command.type) {
      case "OPEN": {
        if (phase !== "waiting") throw new Error("Open is only available while Waiting.");
        if (wordList.length === 0) throw new Error("Add a word list before Open.");
        const now = Date.now();
        runtime.set("phase", "active");
        runtime.set("openedAt", now);
        phase = "active";
        openedAt = new Date(now).toISOString();

        if (participationMode === "group") {
          const groupRecords = readGroupRecords(groups);
          if (groupRecords.length === 0) {
            throw new Error("Send groups from the Virtual Classroom before Open.");
          }
          const groupIds = groupRecords.map((g) => g.id).sort();
          const assigned = assignWordsRoundRobin({ wordList, studentIds: groupIds });
          for (const g of groupRecords) {
            const cardId = cardIdForGroup(g.id);
            const word = assigned[g.id] ?? wordList[0]!;
            const existing = cards.get(cardId);
            if (existing) {
              if (!String(existing.get("assignedWord") ?? "")) {
                existing.set("assignedWord", word);
              }
              if (existing.get("status") === "waiting" || existing.get("status") === "locked") {
                existing.set("status", "active");
              }
              existing.set("displayName", g.name);
            } else {
              cards.set(
                cardId,
                createWordCardLiveObject({
                  id: cardId,
                  ownerType: "group",
                  ownerId: g.id,
                  displayName: g.name,
                  assignedWord: word,
                  status: "active",
                }),
              );
            }
          }
        } else {
          const playerIds = [...participants.entries()]
            .filter(([, p]) => p.get("role") === "player")
            .map(([id]) => id)
            .sort();
          const assigned = assignWordsRoundRobin({ wordList, studentIds: playerIds });

          for (const userId of playerIds) {
            const cardId = cardIdForStudent(userId);
            const word = assigned[userId] ?? wordList[0]!;
            const existing = cards.get(cardId);
            if (existing) {
              if (!String(existing.get("assignedWord") ?? "")) {
                existing.set("assignedWord", word);
              }
              if (existing.get("status") === "waiting") {
                existing.set("status", "active");
              }
            } else {
              const p = participants.get(userId);
              cards.set(
                cardId,
                createWordCardLiveObject({
                  id: cardId,
                  ownerType: "student",
                  ownerId: userId,
                  displayName: String(p?.get("name") ?? userId),
                  assignedWord: word,
                  status: "active",
                }),
              );
            }
          }
        }
        break;
      }
      case "ASSIGN_GROUPS": {
        if (phase === "completed" || phase === "play") {
          throw new Error("Cannot assign groups during play or after Complete.");
        }
        const result = applyAssignGroupsInStorage(storageRoot, {
          groups: input.command.groups,
        });
        if (result.groupCount === 0) {
          throw new Error("Generate groups with at least one member before sending.");
        }
        participationMode = "group";
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
        collectedAt = new Date(now).toISOString();

        for (const [cardId, card] of cards.entries()) {
          if (card.get("ownerType") === "teacher") continue;
          const status = String(card.get("status") ?? "");
          if (
            status === "active" ||
            status === "waiting" ||
            status === "returned" ||
            status === "revising"
          ) {
            let revision = Number(card.get("revision") ?? 1);
            revision += 1;
            card.set("revision", revision);
            card.set("status", "auto_submitted");
            card.set("submittedAt", now);
            card.set("moderation", "pending");
            pending.push(snapshotFromCard(cardId, card, "teacher_collect"));
          } else if (status === "submitted") {
            const priorMod = String(card.get("moderation") ?? "none");
            card.set("status", "locked");
            // Keep prior approvals across a re-collect cycle.
            if (priorMod !== "approved") {
              card.set("moderation", "pending");
            }
            pending.push(snapshotFromCard(cardId, card, "manual"));
          } else if (
            (status === "locked" || status === "auto_submitted") &&
            String(card.get("moderation") ?? "") === "approved"
          ) {
            // Already in class deck — leave untouched.
          }
        }
        break;
      }
      case "RETURN": {
        if (!MODERATION_PHASES.has(phase)) {
          throw new Error("Return is available after Collect.");
        }
        const note = input.command.note.trim().slice(0, 280);
        if (!note) throw new Error("Add a short return note.");
        const ids = input.command.cardIds.filter(Boolean);
        if (ids.length === 0) throw new Error("Select at least one card.");

        for (const id of ids) {
          const card = cards.get(id);
          if (!card) continue;
          const status = String(card.get("status") ?? "");
          const moderation = String(card.get("moderation") ?? "none");
          if (
            status === "submitted" ||
            status === "auto_submitted" ||
            status === "locked" ||
            status === "returned" ||
            status === "revising" ||
            moderation === "approved" ||
            moderation === "pending"
          ) {
            card.set("status", "returned");
            card.set("moderation", "returned");
            card.set("returnNote", note);
            card.set("submittedAt", null);
          }
        }
        break;
      }
      case "APPROVE_CARD": {
        if (!MODERATION_PHASES.has(phase)) {
          throw new Error("Approve is available after Collect.");
        }
        const ids = input.command.cardIds.filter(Boolean);
        if (ids.length === 0) throw new Error("Select at least one card.");

        let approvedAny = false;
        for (const id of ids) {
          const card = cards.get(id);
          if (!card) continue;
          if (card.get("ownerType") === "teacher") continue;
          const moderation = String(card.get("moderation") ?? "none");
          if (moderation !== "pending" && moderation !== "approved") continue;
          card.set("moderation", "approved");
          const status = String(card.get("status") ?? "");
          if (
            status === "submitted" ||
            status === "auto_submitted" ||
            status === "locked"
          ) {
            card.set("status", "locked");
          }
          approvedAny = true;
        }
        if (!approvedAny) throw new Error("No pending cards to approve.");
        if (phase === "collected" || phase === "review") {
          runtime.set("phase", "moderating");
          phase = "moderating";
        }
        break;
      }
      case "EDIT_CARD": {
        if (!MODERATION_PHASES.has(phase)) {
          throw new Error("Edit is available after Collect.");
        }
        const card = cards.get(input.command.cardId);
        if (!card) throw new Error("Card not found.");
        const moderation = String(card.get("moderation") ?? "none");
        if (moderation !== "pending" && moderation !== "approved") {
          throw new Error("Host can edit pending or approved cards only.");
        }
        if (typeof input.command.definition === "string") {
          card.set("definition", input.command.definition.trim().slice(0, 500));
        }
        if (typeof input.command.exampleSentence === "string") {
          card.set(
            "exampleSentence",
            input.command.exampleSentence.trim().slice(0, 500),
          );
        }
        // Moderation unchanged: pending stays pending; approved stays in deck.
        break;
      }
      case "REVISE": {
        if (phase !== "collected" && phase !== "review" && phase !== "moderating") {
          throw new Error("Revise starts after Collect.");
        }
        runtime.set("phase", "revision");
        runtime.set("review", null);
        runtime.set("play", null);
        phase = "revision";
        for (const [, card] of cards.entries()) {
          if (card.get("status") === "returned") {
            card.set("status", "revising");
          }
        }
        break;
      }
      case "SHOW": {
        if (!REVIEW_PUSH_PHASES.has(phase)) {
          throw new Error("Show is available after Collect.");
        }
        assertReviewPushTarget(cards, groups, input.command.cardId);
        runtime.set(
          "review",
          createWordCardsShowReview({
            cardId: input.command.cardId,
            anonymous: input.command.anonymous ?? false,
            taskType: input.command.taskType,
            prompt: input.command.prompt,
          }),
        );
        runtime.set("phase", "review");
        phase = "review";
        break;
      }
      case "COMPARE": {
        if (!REVIEW_PUSH_PHASES.has(phase)) {
          throw new Error("Compare is available after Collect.");
        }
        const [a, b] = input.command.cardIds;
        if (!a || !b || a === b) throw new Error("Compare exactly two different cards.");
        assertReviewPushTarget(cards, groups, a);
        assertReviewPushTarget(cards, groups, b);
        const settingsObj = (settings ?? {}) as { anonymousCompareDefault?: boolean };
        const anonymous =
          input.command.anonymous ?? settingsObj.anonymousCompareDefault ?? true;
        runtime.set(
          "review",
          createWordCardsCompareReview({
            cardIds: [a, b],
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
        const current = readReviewState(runtime);
        if (!current) throw new Error("Show or Compare a card first.");
        runtime.set(
          "review",
          setReviewTaskType(current, input.command.taskType, input.command.prompt),
        );
        break;
      }
      case "REVEAL_RESULTS": {
        const current = readReviewState(runtime);
        if (!current) throw new Error("No active review.");
        runtime.set("review", revealReviewResults(current));
        break;
      }
      case "START_PLAY": {
        if (!START_PLAY_PHASES.has(phase)) {
          throw new Error("Start race from moderation (after Collect / Approve).");
        }
        const roundSettings = (settings ?? {}) as Partial<WordCardsRoundSettings>;
        const minDeck =
          roundSettings.minDeckSizeForPlay ?? DEFAULT_WORD_CARDS_SETTINGS.minDeckSizeForPlay;
        const approved = listApprovedPlayableCards(readApprovedDeckCards(cards));
        if (!canStartDefinitionRace(approved.length, minDeck)) {
          throw new Error(`Need at least ${minDeck} approved cards with definitions to play.`);
        }
        const first = pickNextPromptCard(approved, []);
        if (!first) throw new Error("No playable approved cards.");
        const play = buildPlayItem({
          card: first,
          approvedPlayable: approved,
          itemIndex: 0,
          usedCardIds: [],
        });
        runtime.set("review", null);
        runtime.set("play", play);
        runtime.set("phase", "play");
        phase = "play";
        break;
      }
      case "NEXT_PLAY_ITEM": {
        if (phase !== "play") throw new Error("Next is only available during play.");
        const current = readPlayState(runtime);
        if (!current) throw new Error("No active race.");
        const approved = listApprovedPlayableCards(readApprovedDeckCards(cards));
        const next = pickNextPromptCard(approved, current.usedCardIds);
        if (!next) throw new Error("No more playable cards in the deck.");
        const play = buildPlayItem({
          card: next,
          approvedPlayable: approved,
          itemIndex: current.itemIndex + 1,
          usedCardIds: current.usedCardIds,
        });
        runtime.set("play", play);
        break;
      }
      case "LOCK_PLAY_ANSWERS": {
        if (phase !== "play") throw new Error("Lock is only available during play.");
        const current = readPlayState(runtime);
        if (!current) throw new Error("No active race.");
        if (current.status !== "selecting") {
          throw new Error("Answers are already locked.");
        }
        runtime.set("play", {
          ...current,
          status: "locked",
          lockedAt: Date.now(),
        } satisfies WordCardsPlayState);
        break;
      }
      case "REVEAL_PLAY_RESULTS": {
        if (phase !== "play") throw new Error("Reveal is only available during play.");
        const current = readPlayState(runtime);
        if (!current) throw new Error("No active race.");
        if (current.status !== "locked") {
          throw new Error("Lock answers before Reveal.");
        }
        runtime.set("play", {
          ...current,
          status: "revealed",
          revealedAt: Date.now(),
        } satisfies WordCardsPlayState);
        break;
      }
      case "END_PLAY": {
        if (phase !== "play") throw new Error("End play is only available during play.");
        runtime.set("play", null);
        runtime.set("phase", "moderating");
        phase = "moderating";
        break;
      }
      case "COMPLETE": {
        if (phase === "completed") break;
        const now = Date.now();
        runtime.set("phase", "completed");
        runtime.set("completedAt", now);
        runtime.set("review", null);
        runtime.set("play", null);
        phase = "completed";
        completedAt = new Date(now).toISOString();
        break;
      }
      default:
        throw new Error("Unknown command.");
    }
  });

  for (const item of pending) {
    await persistWordCardSubmission({
      roundId: input.roundId,
      ...item,
    }).catch(() => undefined);
  }

  await upsertWordCardRoundMeta({
    roundId: input.roundId,
    sessionId: input.sessionId,
    joinCode,
    liveblocksRoomId: input.roomId,
    createdBy: input.hostUserId,
    participationMode: participationMode as "individual" | "group",
    phase,
    wordList,
    settings,
    openedAt,
    collectedAt,
    completedAt,
  }).catch(() => undefined);

  try {
    await liveblocks.broadcastEvent(input.roomId, {
      type: "WORD_CARDS_PHASE_CHANGED",
      phase,
    });
  } catch {
    // best-effort
  }

  return { phase };
}

export async function applyWordCardsStudentCommand(input: {
  roomId: string;
  roundId: string;
  userId: string;
  command: WordCardsStudentCommand;
}): Promise<{ status: string | null }> {
  if (input.command.type === "SELECT_PLAY_ANSWER") {
    return applySelectPlayAnswer({
      roomId: input.roomId,
      userId: input.userId,
      command: input.command,
    });
  }
  if (input.command.type === "SUBMIT_REVIEW") {
    return applySubmitReview({
      roomId: input.roomId,
      userId: input.userId,
      command: input.command,
    });
  }
  if (input.command.type === "SET_READY") {
    return applySetReady({
      roomId: input.roomId,
      userId: input.userId,
      ready: input.command.ready,
    });
  }
  return applySubmitCard({
    roomId: input.roomId,
    roundId: input.roundId,
    userId: input.userId,
    command: input.command,
  });
}

async function applySetReady(input: {
  roomId: string;
  userId: string;
  ready: boolean;
}): Promise<{ status: string | null }> {
  const liveblocks = getLiveblocksServerClient();
  await liveblocks.mutateStorage(input.roomId, ({ root }) => {
    const storageRoot = root as unknown as StorageRoot;
    const participants = participantsOf(storageRoot);
    const p = participants.get(input.userId);
    if (!p || p.get("role") === "host") {
      throw new Error("Only students set Ready.");
    }
    p.set("ready", Boolean(input.ready));
  });
  return { status: input.ready ? "ready" : "not_ready" };
}

async function applySubmitReview(input: {
  roomId: string;
  userId: string;
  command: Extract<WordCardsStudentCommand, { type: "SUBMIT_REVIEW" }>;
}): Promise<{ status: string | null }> {
  const liveblocks = getLiveblocksServerClient();
  await liveblocks.mutateStorage(input.roomId, ({ root }) => {
    const storageRoot = root as unknown as StorageRoot;
    const runtime = runtimeOf(storageRoot);
    const review = readReviewState(runtime);
    if (!review) throw new Error("No class review is open.");
    if (review.status === "closed") throw new Error("Review is closed.");
    runtime.set(
      "review",
      submitSharedReviewResponse(review, {
        studentId: input.userId,
        choice: input.command.choice,
        note: input.command.note,
      }),
    );
  });
  return { status: "review_submitted" };
}

async function applySelectPlayAnswer(input: {
  roomId: string;
  userId: string;
  command: Extract<WordCardsStudentCommand, { type: "SELECT_PLAY_ANSWER" }>;
}): Promise<{ status: string | null }> {
  const liveblocks = getLiveblocksServerClient();
  let status: string | null = null;

  await liveblocks.mutateStorage(input.roomId, ({ root }) => {
    const storageRoot = root as unknown as StorageRoot;
    const runtime = runtimeOf(storageRoot);
    if (String(runtime.get("phase") ?? "") !== "play") {
      throw new Error("Answers are only available during the race.");
    }
    const play = readPlayState(runtime);
    if (!play) throw new Error("No active race.");
    if (play.status !== "selecting") {
      throw new Error("Answers are locked.");
    }
    const selected = input.command.selectedWord.trim();
    const allowed = play.choiceWords.some(
      (w) => w.trim().toLowerCase() === selected.toLowerCase(),
    );
    if (!selected || !allowed) {
      throw new Error("Pick one of the word choices.");
    }
    const canonical =
      play.choiceWords.find((w) => w.trim().toLowerCase() === selected.toLowerCase()) ??
      selected;
    const next: WordCardsPlayState = {
      ...play,
      answersByStudentId: {
        ...play.answersByStudentId,
        [input.userId]: {
          selectedWord: canonical,
          updatedAt: Date.now(),
        },
      },
    };
    runtime.set("play", next);
    status = "selected";
  });

  return { status };
}

async function applySubmitCard(input: {
  roomId: string;
  roundId: string;
  userId: string;
  command: Extract<WordCardsStudentCommand, { type: "SUBMIT" }>;
}): Promise<{ status: string | null }> {
  const liveblocks = getLiveblocksServerClient();
  let status: string | null = null;
  const pending: { snapshot: PendingSnapshot | null } = { snapshot: null };

  await liveblocks.mutateStorage(input.roomId, ({ root }) => {
    const storageRoot = root as unknown as StorageRoot;
    const runtime = runtimeOf(storageRoot);
    const phase = String(runtime.get("phase") ?? "waiting");
    if (phase !== "active" && phase !== "revision") {
      throw new Error("Submit is only available during Active or Revision.");
    }

    const cards = cardsOf(storageRoot);
    const groups = groupsOf(storageRoot);
    const participants = participantsOf(storageRoot);
    const card = cards.get(input.command.cardId);
    if (!card) throw new Error("Card not found.");

    const ownerType = String(card.get("ownerType") ?? "");
    const ownerId = String(card.get("ownerId") ?? "");
    const mode = String(runtime.get("participationMode") ?? "individual");
    const settings = (runtime.get("settings") ?? {}) as Partial<WordCardsRoundSettings>;
    const policy =
      (settings.groupSubmitPolicy as ActivityGroupSubmitPolicy | undefined) ??
      DEFAULT_WORD_CARDS_SETTINGS.groupSubmitPolicy;
    const groupRecords = readGroupRecords(groups);
    const group = groupRecords.find((g) => g.id === ownerId);
    const canSubmit = canSubmitWordCardAsUser({
      participationMode: mode,
      userId: input.userId,
      cardOwnerType: ownerType,
      cardOwnerId: ownerId,
      groups: groupRecords,
      policy,
      readyMemberIds: group
        ? readyMemberIdsOf(participants, group.memberIds)
        : [],
    });
    if (!canSubmit) {
      throw new Error(
        ownerType === "group"
          ? "Your group is not ready to submit yet."
          : "Not your card.",
      );
    }

    const currentStatus = String(card.get("status") ?? "");
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
      currentStatus !== "revising" &&
      currentStatus !== "waiting"
    ) {
      throw new Error("Card is not editable.");
    }

    const now = Date.now();
    let revision = Number(card.get("revision") ?? 1);
    const isResubmit =
      phase === "revision" || currentStatus === "returned" || currentStatus === "revising";
    if (isResubmit) revision += 1;

    card.set("revision", revision);
    card.set("status", "submitted");
    card.set("submittedAt", now);
    card.set("moderation", "none");
    status = "submitted";

    pending.snapshot = snapshotFromCard(
      input.command.cardId,
      card,
      isResubmit ? "resubmission" : "manual",
    );
  });

  if (pending.snapshot) {
    await persistWordCardSubmission({
      roundId: input.roundId,
      ...pending.snapshot,
    }).catch(() => undefined);
  }

  try {
    await liveblocks.broadcastEvent(input.roomId, {
      type: "WORD_CARDS_SUBMITTED",
      userId: input.userId,
    });
  } catch {
    // best-effort
  }

  return { status };
}
