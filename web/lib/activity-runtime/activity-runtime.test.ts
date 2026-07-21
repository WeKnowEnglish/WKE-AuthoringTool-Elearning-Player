import { describe, expect, it } from "vitest";
import {
  ACTIVITY_COMMAND_SEMANTICS,
  canEditActivityWork,
  createCompareReview,
  createShowReview,
  documentIdForStudent,
  emptyActiveActivity,
  getVcActivity,
  isActivityLive,
  isRegisteredVcActivity,
  listEnabledVcActivities,
  parseDocumentRoomId,
  studentEntryPathForActivity,
  studentFacingState,
  submitSharedReviewResponse,
  teacherControlLabel,
  toDocumentRoomId,
  toRuntimePhase,
} from "@/lib/activity-runtime";
import {
  canAccessDocumentRoom,
  isDocumentActivityRegistered,
  joinCodeFromDocumentVcSessionId,
} from "@/lib/document-activity";
import { encodeVcMemberToken } from "@/lib/virtual-classroom/session-cookie";
import { getRoomProduct } from "@/lib/liveblocks/room-prefix";

describe("activity-runtime registry", () => {
  it("registers whiteboard, document, and word_cards", () => {
    const kinds = listEnabledVcActivities().map((a) => a.kind);
    expect(kinds).toContain("whiteboard");
    expect(kinds).toContain("document");
    expect(kinds).toContain("word_cards");
    expect(isRegisteredVcActivity("document")).toBe(true);
    expect(isRegisteredVcActivity("word_cards")).toBe(true);
    expect(getVcActivity("document")?.interaction.participationMode).toBe("individual");
    expect(getVcActivity("word_cards")?.interaction.pushToStudent).toBe(true);
    expect(isDocumentActivityRegistered()).toBe(true);
  });
});

describe("activity-runtime phases and commands", () => {
  it("maps student-facing labels and Collect/Complete semantics", () => {
    expect(
      studentFacingState({
        phase: "OPEN",
        workStatus: "SUBMITTED",
        hasReviewPush: true,
      }),
    ).toBe("Class review");
    expect(toRuntimePhase("COLLECTED")).toBe("collected");
    expect(teacherControlLabel("COLLECT_ALL")).toBe("Collect");
    expect(teacherControlLabel("END_ROUND")).toBe("Complete");
    expect(ACTIVITY_COMMAND_SEMANTICS.collect).toMatch(/Does not end the round/);
    expect(ACTIVITY_COMMAND_SEMANTICS.complete).toMatch(/Does not end the session/);
  });

  it("gates document editing during review", () => {
    expect(
      canEditActivityWork({
        phase: "active",
        workStatus: "active",
        role: "player",
        isOwner: true,
        hasReviewPush: false,
      }),
    ).toBe(true);
    expect(
      canEditActivityWork({
        phase: "active",
        workStatus: "active",
        role: "player",
        isOwner: true,
        hasReviewPush: true,
      }),
    ).toBe(false);
  });
});

describe("activity-runtime review + routing", () => {
  it("creates shared show/compare reviews", () => {
    const show = createShowReview({ targetId: documentIdForStudent("s1"), anonymous: true });
    expect(show.targetIds).toEqual(["document:student:s1"]);
    const compare = createCompareReview({
      targetIds: ["document:student:a", "document:student:b"],
      anonymous: false,
    });
    const next = submitSharedReviewResponse(compare, {
      studentId: "u1",
      choice: "document:student:b",
      nowMs: 1,
    });
    expect(next.responsesByStudentId.u1?.choice).toBe("document:student:b");
  });

  it("routes activeActivity without ending session", () => {
    expect(isActivityLive(emptyActiveActivity())).toBe(false);
    expect(
      studentEntryPathForActivity({
        kind: "whiteboard",
        joinCode: "AB12CD",
        label: "Whiteboard",
      }),
    ).toBe("/whiteboard/AB12CD");
    expect(
      studentEntryPathForActivity({
        kind: "document",
        joinCode: "docr_1",
        label: "Document",
        roundId: "docr_1",
      }),
    ).toBe("/document/docr_1");
  });
});

describe("document room identity + auth stub", () => {
  it("builds and parses document room ids", () => {
    const roomId = toDocumentRoomId("vcs_AB34CD", "docr_01HX");
    expect(roomId).toBe("wke-doc-vcs_AB34CD-docr_01HX");
    expect(parseDocumentRoomId(roomId)).toEqual({
      vcSessionId: "vcs_AB34CD",
      roundId: "docr_01HX",
    });
    expect(getRoomProduct(roomId)).toBe("document");
    expect(joinCodeFromDocumentVcSessionId("vcs_AB34CD")).toBe("AB34CD");
  });

  it("authorizes via VC member cookie", () => {
    const room = toDocumentRoomId("vcs_AB34CD", "docr_1");
    const memberCookie = encodeVcMemberToken({
      sessionId: "vcs_AB34CD",
      joinCode: "AB34CD",
      roomId: "wke-vc-session-AB34CD",
      userId: "u1",
      displayName: "Sam",
      role: "member",
    });
    expect(
      canAccessDocumentRoom({
        room,
        role: "player",
        hostCookie: null,
        memberCookie,
      }),
    ).toBe(true);
    expect(
      canAccessDocumentRoom({
        room,
        role: "player",
        hostCookie: null,
        memberCookie: null,
      }),
    ).toBe(false);
  });
});
