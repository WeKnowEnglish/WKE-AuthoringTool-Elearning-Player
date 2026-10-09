import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assertDocumentSubmissionRecoveryConfigured, readPendingDocumentSubmission, sealPendingDocumentSubmission } from "./pending-submission";

const context = { roomId: "room-a", roundId: "round-a" };
const work = { documentId: "document-a", ownerId: "student-a", revision: 1, plainText: "Private student writing", contentJson: { text: "Private student writing" } };
beforeEach(() => vi.stubEnv("DOCUMENT_SUBMISSION_SECRET", "test-recovery-key"));
afterEach(() => vi.unstubAllEnvs());

describe("private, authenticated pending document snapshots", () => {
  it("preserves recovery tokens created before the shared-codec refactor", () => {
    vi.stubEnv("DOCUMENT_SUBMISSION_SECRET", "compatibility-fixture-key");
    const token = "document-submission-v1.AwMDAwMDAwMDAwMD.rwDXU0uEaDwyuy9CyMWLmg.Vz2vMsmtsuBXTz6LqUi-VsKKOIKFIY782OLcrbBhVg";
    expect(readPendingDocumentSubmission(token, context)).toEqual({ text: "Earlier pending work" });
  });
  it("recovers exact work without putting readable content in shared room storage", () => {
    const token = sealPendingDocumentSubmission(work, context);
    expect(token).not.toContain(work.plainText);
    expect(Buffer.from(token.split(".")[3], "base64url").toString("utf8")).not.toContain(work.plainText);
    expect(readPendingDocumentSubmission(token, context)).toEqual(work);
  });
  it("uses a new nonce for every snapshot", () => {
    expect(sealPendingDocumentSubmission(work, context)).not.toBe(sealPendingDocumentSubmission(work, context));
  });
  it.each([{ roomId: "room-b", roundId: "round-a" }, { roomId: "room-a", roundId: "round-b" }])("rejects a snapshot copied to another room or round: %j", (other) => {
    expect(readPendingDocumentSubmission(sealPendingDocumentSubmission(work, context), other)).toBeNull();
  });
  it.each([1, 2, 3])("rejects tampering with token section %i", (section) => {
    const parts = sealPendingDocumentSubmission(work, context).split(".");
    const bytes = Buffer.from(parts[section], "base64url"); bytes[0] ^= 1;
    parts[section] = bytes.toString("base64url");
    expect(readPendingDocumentSubmission(parts.join("."), context)).toBeNull();
  });
  it.each([null, work, "{}", "document-submission-v1.a.b.c", "unknown.a.b.c"]) ("rejects malformed or unsigned data: %j", (value) => {
    expect(readPendingDocumentSubmission(value, context)).toBeNull();
  });
  it("rejects tokens signed with a different key", () => {
    const token = sealPendingDocumentSubmission(work, context);
    vi.stubEnv("DOCUMENT_SUBMISSION_SECRET", "another-key");
    expect(readPendingDocumentSubmission(token, context)).toBeNull();
  });
  it("does not fall back to a public development key", () => {
    vi.stubEnv("DOCUMENT_SUBMISSION_SECRET", ""); vi.stubEnv("VIRTUAL_CLASSROOM_COOKIE_SECRET", ""); vi.stubEnv("LIVEBLOCKS_SECRET_KEY", "");
    expect(() => assertDocumentSubmissionRecoveryConfigured()).toThrow("not configured");
    expect(() => sealPendingDocumentSubmission(work, context)).toThrow("not configured");
  });
  it("supports the existing classroom secret when a dedicated recovery key is absent", () => {
    vi.stubEnv("DOCUMENT_SUBMISSION_SECRET", ""); vi.stubEnv("VIRTUAL_CLASSROOM_COOKIE_SECRET", "existing-classroom-key");
    expect(readPendingDocumentSubmission(sealPendingDocumentSubmission(work, context), context)).toEqual(work);
  });
});
