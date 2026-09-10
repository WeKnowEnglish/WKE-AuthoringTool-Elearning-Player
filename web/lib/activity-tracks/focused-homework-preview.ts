import {
  HOMEWORK_COLLECTION_VERSION,
  type HomeworkCollectionDocument,
} from "@/lib/homework-collections";
import type { ActivityTrackDocument } from "@/lib/activity-tracks/types";

/** One-part collection for authoring preview when the full freeze is not ready. */
export function focusedHomeworkCollectionPreview(
  document: ActivityTrackDocument,
  focusPartId: string | null | undefined,
): HomeworkCollectionDocument | null {
  if (!focusPartId) return null;
  const part = document.parts.find((entry) => entry.id === focusPartId);
  if (part?.source.type !== "homework_part") return null;
  return {
    version: HOMEWORK_COLLECTION_VERSION,
    parts: [part.source.part],
  };
}
