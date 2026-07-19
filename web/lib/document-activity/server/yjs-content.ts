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
    const plainText = plainTextFromUnknown(keyed).trim();
    return {
      contentJson: keyed ?? {},
      plainText,
      wordCount: countWords(plainText),
    };
  } catch {
    try {
      const all = await liveblocks.getYjsDocument(input.roomId, { format: true });
      const slice =
        all && typeof all === "object"
          ? (all as Record<string, unknown>)[input.documentId]
          : undefined;
      const plainText = plainTextFromUnknown(slice ?? all).trim();
      return {
        contentJson: slice ?? all ?? {},
        plainText,
        wordCount: countWords(plainText),
      };
    } catch {
      return { contentJson: {}, plainText: "", wordCount: 0 };
    }
  }
}
