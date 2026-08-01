import { describe, expect, it } from "vitest";
import type { VocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/types";
import {
  compileVerbTableFromVocabList,
  createSampleVerbTableDocument,
  isVerbTableCellCorrect,
  lookupVerbEntry,
  scoreVerbTableAnswers,
  validateVerbTableDocument,
  verbTableCellId,
  verbTableStubPack,
} from "@/lib/verb-table";

function verbList(words: string[]): VocabularyListDocument {
  return {
    version: 1,
    kind: "vocabulary-list",
    id: "verb-list-test",
    name: "Common verbs",
    entries: words.map((word, index) => ({
      id: `v${index + 1}`,
      word,
    })),
  };
}

describe("verb table module", () => {
  it("validates the HT1 sample", () => {
    const doc = createSampleVerbTableDocument();
    expect(doc.rows).toHaveLength(6);
    expect(verbTableStubPack(doc).kind).toBe("verb-table-pack");
  });

  it("scores slash-alternative past forms", () => {
    expect(isVerbTableCellCorrect("were", "was/were")).toBe(true);
    expect(isVerbTableCellCorrect("was", "was/were")).toBe(true);
    expect(isVerbTableCellCorrect("is", "was/were")).toBe(false);

    const row = createSampleVerbTableDocument().rows[0]!;
    const score = scoreVerbTableAnswers([row], {
      [verbTableCellId(row.id, "past")]: "went",
    });
    expect(score).toEqual({ correct: 1, total: 1 });
  });

  it("looks up curated verb forms and compiles from a vocab list", () => {
    expect(lookupVerbEntry("write")?.forms.past).toBe("wrote");
    const doc = compileVerbTableFromVocabList({
      list: verbList(["go", "see", "write", "eat"]),
      maxRows: 4,
    });
    expect(doc.rows.length).toBe(4);
    expect(() => validateVerbTableDocument(doc)).not.toThrow();
  });

  it("rejects vocab lists with no resolvable verbs", () => {
    expect(() =>
      compileVerbTableFromVocabList({
        list: verbList(["painting", "drawing"]),
      }),
    ).toThrow(/No verbs/);
  });
});
