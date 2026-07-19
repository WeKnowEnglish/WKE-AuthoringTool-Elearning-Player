import { describe, expect, it } from "vitest";
import {
  createRoundId,
  defaultPromptForTemplate,
  documentIdForStudent,
  isDocumentActivityRegistered,
  parseDocumentRoomId,
  toDocumentRoomId,
} from "@/lib/document-activity/domain";
import { createDocumentInitialStorage } from "@/lib/document-activity/liveblocks/initial-storage";
import { canAccessDocumentRoom, joinCodeFromDocumentVcSessionId } from "@/lib/document-activity/auth-policy";
import { encodeVcMemberToken } from "@/lib/virtual-classroom/session-cookie";

describe("document activity chunk 1", () => {
  it("registers and builds room identity", () => {
    expect(isDocumentActivityRegistered()).toBe(true);
    const roundId = createRoundId();
    expect(roundId.startsWith("docr_")).toBe(true);
    const roomId = toDocumentRoomId("vcs_AB34CD", roundId);
    expect(parseDocumentRoomId(roomId)).toEqual({
      vcSessionId: "vcs_AB34CD",
      roundId,
    });
    expect(documentIdForStudent("u1")).toBe("document:student:u1");
    expect(joinCodeFromDocumentVcSessionId("vcs_AB34CD")).toBe("AB34CD");
  });

  it("defaults paragraph prompt and waiting storage", () => {
    const prompt = defaultPromptForTemplate("paragraph");
    expect(prompt.title.toLowerCase()).toContain("paragraph");
    const storage = createDocumentInitialStorage({
      hostUserId: "teacher1",
      roundId: "docr_test",
      vcSessionId: "vcs_AB34CD",
    });
    expect(storage.runtime.get("phase")).toBe("waiting");
    expect(storage.runtime.get("participationMode")).toBe("individual");
    expect(storage.runtime.get("templateType")).toBe("paragraph");
    expect(storage.documents.size).toBe(0);
  });

  it("authorizes document room via VC member cookie", () => {
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
  });
});
