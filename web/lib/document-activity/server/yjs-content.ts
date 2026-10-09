import "server-only";

import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import { countWords, plainTextFromUnknown } from "@/lib/document-activity/snapshot";

export async function readDocumentYjsContent(input: {
  roomId: string;
  documentId: string;
}): Promise<{ contentJson: unknown; plainText: string; wordCount: number }> {
  const liveblocks = getLiveblocksServerClient();
  try {
    const keyed = await liveblocks.getYjsDocument(input.roomId, {
      key: input.documentId,
      format: true,
    });
    if (keyed == null) throw new Error("Document content was not returned.");
    const plainText = plainTextFromUnknown(keyed).trim();
    return {
      contentJson: keyed,
      plainText,
      wordCount: countWords(plainText),
    };
  } catch {
    try {
      const all = await liveblocks.getYjsDocument(input.roomId, { format: true });
      // A room can contain several students' documents. Never save the whole
      // room as a fallback for one missing document.
      if (
        !all ||
        typeof all !== "object" ||
        Array.isArray(all) ||
        !Object.prototype.hasOwnProperty.call(all, input.documentId)
      ) {
        throw new Error("The requested document was not returned.");
      }
      const slice = (all as Record<string, unknown>)[input.documentId];
      if (slice == null) throw new Error("Document content was not returned.");
      const plainText = plainTextFromUnknown(slice).trim();
      return {
        contentJson: slice,
        plainText,
        wordCount: countWords(plainText),
      };
    } catch {
      throw new Error("Could not read this document. Its work has not been saved; please retry collection.");
    }
  }
}
