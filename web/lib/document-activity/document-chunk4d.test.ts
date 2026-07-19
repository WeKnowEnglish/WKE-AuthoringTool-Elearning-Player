import { describe, expect, it } from "vitest";
import { canSubmitDocumentAsUser } from "@/lib/document-activity/group-membership";

describe("document group submit policies (chunk 4d)", () => {
  const groups = [
    { id: "g1", name: "Blue", memberIds: ["u1", "u2", "u3"], leaderId: "u1" },
  ];

  it("allows any member by default", () => {
    expect(
      canSubmitDocumentAsUser({
        participationMode: "group",
        userId: "u2",
        documentOwnerType: "group",
        documentOwnerId: "g1",
        groups,
        groupSubmitPolicy: "any_member",
        readyMemberIds: [],
      }).ok,
    ).toBe(true);
  });

  it("enforces leader_only", () => {
    expect(
      canSubmitDocumentAsUser({
        participationMode: "group",
        userId: "u2",
        documentOwnerType: "group",
        documentOwnerId: "g1",
        groups,
        groupSubmitPolicy: "leader_only",
        readyMemberIds: ["u1", "u2", "u3"],
      }).ok,
    ).toBe(false);
    expect(
      canSubmitDocumentAsUser({
        participationMode: "group",
        userId: "u1",
        documentOwnerType: "group",
        documentOwnerId: "g1",
        groups,
        groupSubmitPolicy: "leader_only",
        readyMemberIds: [],
      }).ok,
    ).toBe(true);
  });

  it("enforces everyone_ready", () => {
    expect(
      canSubmitDocumentAsUser({
        participationMode: "group",
        userId: "u1",
        documentOwnerType: "group",
        documentOwnerId: "g1",
        groups,
        groupSubmitPolicy: "everyone_ready",
        readyMemberIds: ["u1", "u2"],
      }).reason,
    ).toMatch(/Ready/);
    expect(
      canSubmitDocumentAsUser({
        participationMode: "group",
        userId: "u1",
        documentOwnerType: "group",
        documentOwnerId: "g1",
        groups,
        groupSubmitPolicy: "everyone_ready",
        readyMemberIds: ["u1", "u2", "u3"],
      }).ok,
    ).toBe(true);
  });

  it("keeps individual ownership checks", () => {
    expect(
      canSubmitDocumentAsUser({
        participationMode: "individual",
        userId: "u1",
        documentOwnerType: "student",
        documentOwnerId: "u1",
        groups: [],
        groupSubmitPolicy: "any_member",
        readyMemberIds: [],
      }).ok,
    ).toBe(true);
    expect(
      canSubmitDocumentAsUser({
        participationMode: "individual",
        userId: "u1",
        documentOwnerType: "student",
        documentOwnerId: "u2",
        groups: [],
        groupSubmitPolicy: "any_member",
        readyMemberIds: [],
      }).ok,
    ).toBe(false);
  });
});
