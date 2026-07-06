import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyGardenSnapshot } from "@/lib/garden/defaults";
import {
  canAddCellToSelection,
  createLetterGridSession,
  earnSeedsEventId,
  generateLetterGrid,
  isEarnSeedsGridWord,
  isEarnSeedsUnlocked,
  trySubmitEarnSeedsWord,
  wordFromCellIndices,
} from "@/lib/garden/earn-seeds-grid";
import { getGardenSnapshot, setGardenSnapshot } from "@/lib/garden/storage";
import { trySpellWord } from "@/lib/garden/spell-actions";

function installLocalStorage() {
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("window", Object.assign(globalThis, { localStorage }));
  return localStorage;
}

describe("earn-seeds-grid", () => {
  it("generates a 16-letter grid", () => {
    const letters = generateLetterGrid(() => 0.1);
    expect(letters).toHaveLength(16);
    expect(letters.every((ch) => /^[A-Z]$/.test(ch))).toBe(true);
  });

  it("builds words from cell indices without reusing a cell", () => {
    const letters = ["C", "A", "T", "X", "A", "T", "Y", "Z", "A", "B", "C", "D", "E", "F", "G", "H"];
    expect(wordFromCellIndices(letters, [0, 1, 2])).toBe("CAT");
    expect(wordFromCellIndices(letters, [0, 0])).toBeNull();
  });

  it("accepts valid kid-dictionary words of length 3+ within the spelling level", () => {
    expect(isEarnSeedsGridWord("cat", 1)).toBe(true);
    expect(isEarnSeedsGridWord("bit", 1)).toBe(true);
    expect(isEarnSeedsGridWord("at", 1)).toBe(false);
    expect(isEarnSeedsGridWord("xyz", 1)).toBe(false);
    expect(isEarnSeedsGridWord("bread", 1)).toBe(false);
    expect(isEarnSeedsGridWord("bread", 5)).toBe(true);
  });

  it("unlocks after the first spelling-list word", () => {
    installLocalStorage();
    const fresh = emptyGardenSnapshot();
    expect(isEarnSeedsUnlocked(fresh)).toBe(false);

    const spelled = trySpellWord(
      { ...fresh, letters: { Q: 1, U: 1, I: 1, Z: 1 } },
      "QUIZ",
    );
    expect(spelled.ok).toBe(true);
    expect(isEarnSeedsUnlocked(spelled.snapshot)).toBe(true);
  });

  describe("seed grants", () => {
    beforeEach(() => {
      installLocalStorage();
      setGardenSnapshot(emptyGardenSnapshot());
    });

    it("grants one seed per valid word per grid session", () => {
      const session = {
        sessionId: "sess-cat",
        letters: ["C", "A", "T", "E", "R", "S", "O", "N", "L", "I", "P", "M", "D", "G", "B", "U"],
        foundWords: [] as string[],
      };

      const first = trySubmitEarnSeedsWord(getGardenSnapshot(), session, [0, 1, 2]);
      expect(first.ok).toBe(true);
      if (!first.ok) return;
      expect(first.snapshot.seedPouch).toHaveLength(2);
      expect(first.session.foundWords).toEqual(["CAT"]);

      const again = trySubmitEarnSeedsWord(first.snapshot, first.session, [0, 1, 2]);
      expect(again.ok).toBe(false);
      if (again.ok) return;
      expect(again.reason).toBe("already_found");

      const newSession = {
        sessionId: "sess-cat-2",
        letters: [...session.letters],
        foundWords: [] as string[],
      };
      const replay = trySubmitEarnSeedsWord(first.snapshot, newSession, [0, 1, 2]);
      expect(replay.ok).toBe(true);
      if (!replay.ok) return;
      expect(replay.snapshot.seedPouch).toHaveLength(3);
    });

    it("does not consume letters from the grid between words", () => {
      const session = {
        sessionId: "sess-1",
        letters: ["C", "A", "T", "E", "R", "S", "O", "N", "L", "I", "P", "M", "D", "G", "B", "U"],
        foundWords: [] as string[],
      };

      const first = trySubmitEarnSeedsWord(getGardenSnapshot(), session, [0, 1, 2]);
      expect(first.ok).toBe(true);
      if (!first.ok) return;

      const second = trySubmitEarnSeedsWord(first.snapshot, first.session, [0, 1, 4]);
      expect(second.ok).toBe(true);
      expect(session.letters).toEqual([
        "C", "A", "T", "E", "R", "S", "O", "N", "L", "I", "P", "M", "D", "G", "B", "U",
      ]);
    });
  });

  it("prevents selecting the same cell twice in one word", () => {
    expect(canAddCellToSelection([0, 1], 1)).toBe(false);
    expect(canAddCellToSelection([0, 1], 2)).toBe(true);
  });

  it("uses stable event ids per session word", () => {
    expect(earnSeedsEventId("abc", "cat")).toBe("earn-seeds:abc:CAT");
  });
});
