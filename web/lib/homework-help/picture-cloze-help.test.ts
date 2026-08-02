import { describe, expect, it } from "vitest";
import {
  advancePictureClozeHelp,
  emptyHelpStruggle,
  getPictureClozeHelpStep,
  helpLevelFromWrongChecks,
  pictureClozeScaffoldBankFilter,
  recordPictureClozeWrongCheck,
  resolveUnlockedHelpLevel,
} from "@/lib/homework-help";
import { createSamplePictureClozeDocument } from "@/lib/picture-cloze";

describe("homework help ladder", () => {
  it("unlocks levels from wrong-check counts", () => {
    expect(helpLevelFromWrongChecks(0)).toBe("orient");
    expect(helpLevelFromWrongChecks(1)).toBe("diagnose");
    expect(helpLevelFromWrongChecks(2)).toBe("scaffold");
    expect(helpLevelFromWrongChecks(3)).toBe("reveal");
  });

  it("advances help requests to the next ladder rung", () => {
    let struggle = emptyHelpStruggle();
    expect(resolveUnlockedHelpLevel(struggle)).toBe("orient");
    struggle = advancePictureClozeHelp(struggle);
    expect(resolveUnlockedHelpLevel(struggle)).toBe("diagnose");
    struggle = advancePictureClozeHelp(struggle);
    expect(resolveUnlockedHelpLevel(struggle)).toBe("scaffold");
    struggle = advancePictureClozeHelp(struggle);
    expect(resolveUnlockedHelpLevel(struggle)).toBe("reveal");
  });

  it("diagnoses empty, off-bank, and wrong-bank answers", () => {
    const doc = createSamplePictureClozeDocument();
    const item = doc.items[0]!;
    const empty = getPictureClozeHelpStep({
      item,
      wordBank: doc.wordBank,
      answer: "",
      struggle: { wrongChecks: 1, helpRequests: 0 },
    });
    expect(empty.level).toBe("diagnose");
    expect(empty.message.toLowerCase()).toContain("word bank");

    const offBank = getPictureClozeHelpStep({
      item,
      wordBank: doc.wordBank,
      answer: "banana",
      struggle: { wrongChecks: 1, helpRequests: 0 },
    });
    expect(offBank.message.toLowerCase()).toContain("word bank");

    const wrongBankWord = doc.wordBank.find(
      (word) => word.toLowerCase() !== item.acceptedAnswers[0]?.toLowerCase(),
    );
    expect(wrongBankWord).toBeTruthy();
    const wrong = getPictureClozeHelpStep({
      item,
      wordBank: doc.wordBank,
      answer: wrongBankWord!,
      struggle: { wrongChecks: 1, helpRequests: 0 },
    });
    expect(wrong.message.toLowerCase()).toContain("does not match");
  });

  it("scaffolds with first letter and filters the bank", () => {
    const doc = createSamplePictureClozeDocument();
    const item = doc.items[0]!;
    const step = getPictureClozeHelpStep({
      item,
      wordBank: doc.wordBank,
      answer: "x",
      struggle: { wrongChecks: 2, helpRequests: 0 },
    });
    expect(step.level).toBe("scaffold");
    expect(step.tip).toMatch(/Starts with /i);

    const filtered = pictureClozeScaffoldBankFilter(item, doc.wordBank);
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.length).toBeLessThanOrEqual(doc.wordBank.length);
  });

  it("reveals the canonical answer after enough struggle", () => {
    const doc = createSamplePictureClozeDocument();
    const item = doc.items[0]!;
    const step = getPictureClozeHelpStep({
      item,
      wordBank: doc.wordBank,
      answer: "",
      struggle: recordPictureClozeWrongCheck(
        recordPictureClozeWrongCheck(
          recordPictureClozeWrongCheck(emptyHelpStruggle()),
        ),
      ),
    });
    expect(step.level).toBe("reveal");
    expect(step.revealAnswer).toBe(item.acceptedAnswers[0]);
    expect(step.actions).toContain("show_answer");
  });
});
