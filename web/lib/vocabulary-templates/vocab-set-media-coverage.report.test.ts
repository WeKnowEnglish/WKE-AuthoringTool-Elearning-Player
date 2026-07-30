import { describe, expect, it } from "vitest";
import { VOCAB_SET_IDS } from "@/lib/vocabulary-templates/types";
import { getVocabularySet } from "@/lib/vocabulary-templates/registry";

describe("vocab set media coverage report", () => {
  it("prints image gaps for themed banks", () => {
    const lines: string[] = [];
    let totalReal = 0;
    let totalWords = 0;
    const uploadPriority: Array<{ setId: string; lemma: string }> = [];

    for (const setId of VOCAB_SET_IDS) {
      const set = getVocabularySet(setId);
      expect(set).toBeTruthy();
      const missing: string[] = [];
      let real = 0;
      for (const word of set!.words) {
        totalWords += 1;
        const url = word.imageUrl?.trim() ?? "";
        const hasReal = Boolean(url) && !url.includes("placehold.co");
        if (hasReal) {
          real += 1;
          totalReal += 1;
        } else {
          missing.push(word.lemma);
          uploadPriority.push({ setId, lemma: word.lemma });
        }
      }
      lines.push(`${setId}\t${real}/${set!.words.length}\t${missing.join(", ")}`);
    }

    // Keep output visible in vitest reporter.
    // eslint-disable-next-line no-console
    console.log(
      ["SET\tREADY/TOTAL\tMISSING", ...lines, "", `TOTAL\t${totalReal}/${totalWords}`].join(
        "\n",
      ),
    );
    expect(totalWords).toBe(255);
    expect(uploadPriority.length).toBeGreaterThan(0);
  });
});
