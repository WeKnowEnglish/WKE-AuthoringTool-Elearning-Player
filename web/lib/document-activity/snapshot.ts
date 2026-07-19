/** Submission snapshot helpers (Chunk 2). */

export type DocumentSubmissionType =
  | "manual"
  | "teacher_collect"
  | "timer_expiry"
  | "resubmission";

export type DocumentSubmissionSnapshot = {
  roundId: string;
  documentId: string;
  ownerType: "student" | "group" | "class";
  ownerId: string;
  contributorIds: string[];
  revision: number;
  submissionType: DocumentSubmissionType;
  contentJson: unknown;
  plainText: string;
  wordCount: number;
  submittedAt: string;
};

export function countWords(plainText: string): number {
  const trimmed = plainText.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function submissionSnapshotId(
  roundId: string,
  documentId: string,
  revision: number,
): string {
  return `${roundId}:${documentId}:${revision}`;
}

/** Best-effort plain text from Liveblocks getYjsDocument JSON / ProseMirror JSON. */
export function plainTextFromUnknown(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map(plainTextFromUnknown).filter(Boolean).join(" ");
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.text === "string") return obj.text;
    if (obj.type === "text" && typeof obj.text === "string") return obj.text;
    if (Array.isArray(obj.content)) {
      return obj.content.map(plainTextFromUnknown).filter(Boolean).join(
        obj.type === "paragraph" || obj.type === "heading" ? "\n" : " ",
      );
    }
    // Yjs map dump — concatenate string leaves
    return Object.values(obj).map(plainTextFromUnknown).filter(Boolean).join(" ");
  }
  return "";
}
