import { describe, expect, it } from "vitest";
import {
  advanceDragSentenceHelp,
  applyDragSentenceReveal,
  applyDragSentenceScaffold,
  buildDragSentenceBankTiles,
  evaluateDragSentenceCheck,
  getDragSentenceHelpStep,
  recordDragSentenceWrongCheck,
} from "@/lib/homework-help/drag-sentence";
import { emptyHelpStruggle, resolveUnlockedHelpLevel } from "@/lib/homework-help";

const ORDER = ["We", "buy", "bread", "at", "the", "bakery.", "every", "day"];

describe("drag sentence check + tile bank", () => {
  it("keeps unique ids when word text repeats", () => {
    const bank = buildDragSentenceBankTiles(["the", "cat", "and", "the", "dog"]);
    expect(bank.map((t) => t.id)).toEqual([
      "bank-0",
      "bank-1",
      "bank-2",
      "bank-3",
      "bank-4",
    ]);
    expect(bank.filter((t) => t.text === "the")).toHaveLength(2);
  });

  it("locks correct slots and kicks wrong or empty ones", () => {
    const slots = [
      { id: "a", text: "We", locked: false },
      { id: "b", text: "buy", locked: false },
      { id: "c", text: "cake", locked: false },
      null,
      { id: "d", text: "the", locked: false },
      { id: "e", text: "bakery.", locked: false },
      { id: "f", text: "every", locked: false },
      { id: "g", text: "day", locked: false },
    ];
    const result = evaluateDragSentenceCheck(slots, ORDER);
    expect(result.lockIndices).toEqual([0, 1, 4, 5, 6, 7]);
    expect(result.kickIndices).toEqual([2]);
    expect(result.emptyCount).toBe(1);
    expect(result.allCorrect).toBe(false);
  });

  it("treats already-locked slots as settled", () => {
    const slots = ORDER.map((text, i) => ({
      id: `t-${i}`,
      text,
      locked: i < 3,
    }));
    slots[3] = { id: "wrong", text: "xx", locked: false };
    const result = evaluateDragSentenceCheck(slots, ORDER);
    expect(result.lockedCount).toBe(3);
    expect(result.kickIndices).toEqual([3]);
    expect(result.lockIndices).toEqual([4, 5, 6, 7]);
  });
});

describe("drag sentence help ladder", () => {
  it("advances help requests through orient → reveal", () => {
    let struggle = emptyHelpStruggle();
    expect(resolveUnlockedHelpLevel(struggle)).toBe("orient");
    struggle = advanceDragSentenceHelp(struggle);
    expect(resolveUnlockedHelpLevel(struggle)).toBe("diagnose");
    struggle = advanceDragSentenceHelp(struggle);
    expect(resolveUnlockedHelpLevel(struggle)).toBe("scaffold");
    struggle = advanceDragSentenceHelp(struggle);
    expect(resolveUnlockedHelpLevel(struggle)).toBe("reveal");
  });

  it("scaffolds the next problem word and reveal fills the sentence", () => {
    const bank = buildDragSentenceBankTiles(ORDER);
    const slots = Array.from({ length: ORDER.length }, () => null);
    const scaffold = applyDragSentenceScaffold({ slots, bank, correctOrder: ORDER });
    expect(scaffold).not.toBeNull();
    expect(scaffold!.slots[0]).toEqual(
      expect.objectContaining({ text: "We", locked: true }),
    );
    expect(scaffold!.bank).toHaveLength(ORDER.length - 1);

    const revealed = applyDragSentenceReveal({
      slots: scaffold!.slots,
      bank: scaffold!.bank,
      correctOrder: ORDER,
    });
    expect(revealed.slots.map((s) => s.text)).toEqual(ORDER);
    expect(revealed.slots.every((s) => s.locked)).toBe(true);
    expect(revealed.bank).toHaveLength(0);
  });

  it("reveals after enough wrong checks", () => {
    const step = getDragSentenceHelpStep({
      correctOrder: ORDER,
      slots: Array.from({ length: ORDER.length }, () => null),
      struggle: recordDragSentenceWrongCheck(
        recordDragSentenceWrongCheck(recordDragSentenceWrongCheck(emptyHelpStruggle())),
      ),
    });
    expect(step.level).toBe("reveal");
    expect(step.revealAnswer).toBe(ORDER.join(" "));
    expect(step.actions).toContain("show_answer");
  });
});
