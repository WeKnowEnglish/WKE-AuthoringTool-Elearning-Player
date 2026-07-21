import { describe, expect, it } from "vitest";
import { searchPrimaryVocabularyIndex, getPrimaryVocabularySearchEntries } from "@/lib/vocabulary/primary-candidates";

/**
 * Pack editor contract smoke: search + add semantics used by WordPackEditorClient.
 * Persistence is covered by Supabase migration 056 + server actions (manual / e2e).
 */
describe("word pack editor search contract", () => {
  it("returns addable candidate rows with stable ids", () => {
    const entries = getPrimaryVocabularySearchEntries();
    const hits = searchPrimaryVocabularyIndex(
      entries,
      { primaryTopic: "food_drink", pos: "noun" },
      { limit: 10 },
    );
    expect(hits.length).toBeGreaterThan(0);
    for (const hit of hits) {
      expect(hit.id).toMatch(/^pv_/);
      expect(hit.lemma.length).toBeGreaterThan(0);
      expect(hit.pos).toBe("noun");
      expect(hit.primaryTopic).toBe("food_drink");
    }
  });
});
