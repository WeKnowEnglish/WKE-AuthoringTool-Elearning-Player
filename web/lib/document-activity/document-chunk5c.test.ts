import { describe, expect, it } from "vitest";
import { documentIdForWholeClass } from "@/lib/document-activity/domain";
import {
  canCompareInParticipationMode,
  canSubmitDocumentAsUser,
  documentIdForUserInRound,
} from "@/lib/document-activity/group-membership";
import { createDocumentInitialStorage } from "@/lib/document-activity/liveblocks/initial-storage";
import { canPushDocumentForReview } from "@/lib/document-activity/review";

describe("document whole-class domain (chunk 5c)", () => {
  it("resolves every user to document:whole-class", () => {
    expect(
      documentIdForUserInRound({
        participationMode: "whole_class",
        userId: "u1",
        groups: [],
      }),
    ).toBe(documentIdForWholeClass());
    expect(
      documentIdForUserInRound({
        participationMode: "whole_class",
        userId: "u9",
        groups: [],
      }),
    ).toBe("document:whole-class");
  });

  it("creates class document in initial storage", () => {
    const storage = createDocumentInitialStorage({
      hostUserId: "teacher1",
      roundId: "docr_wc",
      vcSessionId: "vcs_AB34CD",
      participationMode: "whole_class",
    });
    expect(storage.runtime.get("participationMode")).toBe("whole_class");
    expect(storage.documents.has(documentIdForWholeClass())).toBe(true);
    const doc = storage.documents.get(documentIdForWholeClass());
    expect(doc?.get("ownerType")).toBe("class");
    expect(doc?.get("ownerId")).toBe("class");
    expect(doc?.get("displayName")).toBe("Class");
  });

  it("does not create class doc for individual launches", () => {
    const storage = createDocumentInitialStorage({
      hostUserId: "teacher1",
      roundId: "docr_ind",
      vcSessionId: "vcs_AB34CD",
      participationMode: "individual",
    });
    expect(storage.documents.size).toBe(0);
  });

  it("blocks student submit; host collects instead", () => {
    const gate = canSubmitDocumentAsUser({
      participationMode: "whole_class",
      userId: "u1",
      documentOwnerType: "class",
      documentOwnerId: "class",
      groups: [],
      groupSubmitPolicy: "any_member",
      readyMemberIds: [],
    });
    expect(gate.ok).toBe(false);
    expect(gate.reason).toMatch(/teacher will collect/i);
  });

  it("disallows Compare in whole-class mode", () => {
    expect(canCompareInParticipationMode("whole_class")).toBe(false);
    expect(canCompareInParticipationMode("individual")).toBe(true);
    expect(canCompareInParticipationMode("group")).toBe(true);
  });

  it("allows Show push after collect statuses on class doc", () => {
    expect(
      canPushDocumentForReview({
        status: "auto_submitted",
        ownerType: "class",
        ownerId: "class",
      }),
    ).toBe(true);
    expect(
      canPushDocumentForReview({
        status: "active",
        ownerType: "class",
        ownerId: "class",
      }),
    ).toBe(false);
  });
});
