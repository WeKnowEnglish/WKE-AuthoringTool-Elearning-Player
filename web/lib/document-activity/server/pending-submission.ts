import "server-only";

import { createPendingSnapshotCodec } from "@/lib/activity-runtime/server/pending-snapshot";

const codec = createPendingSnapshotCodec({
  version: "document-submission-v1",
  getSecret: () => process.env.DOCUMENT_SUBMISSION_SECRET || process.env.VIRTUAL_CLASSROOM_COOKIE_SECRET || process.env.LIVEBLOCKS_SECRET_KEY,
  configurationError: "Document submission recovery is not configured.",
});

export function assertDocumentSubmissionRecoveryConfigured(): void {
  codec.assertConfigured();
}

/** Shared room storage must not expose pending students' text or accept forged snapshots. */
export const sealPendingDocumentSubmission = codec.seal;

/** Callers still verify current classroom access, actor, document, owner, and revision. */
export const readPendingDocumentSubmission = codec.read;
