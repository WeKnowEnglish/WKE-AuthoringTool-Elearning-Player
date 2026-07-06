import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyGardenSnapshot } from "@/lib/garden/defaults";
import {
  recycleLetters,
  selectionToLetterList,
  subtractConsumedFromSelection,
} from "@/lib/garden/recycle-letters";

function installStorage() {
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
}

describe("recycleLetters", () => {
  beforeEach(() => {
    installStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("turns 3 letters into 1 common seed", () => {
    const snap = { ...emptyGardenSnapshot(), letters: { A: 3 } };
    const result = recycleLetters(snap, { A: 3 }, 1000);

    expect(result).toMatchObject({
      ok: true,
      lettersConsumed: 3,
      seedsGranted: 1,
      consumed: { A: 3 },
    });
    if (!result.ok) return;

    expect(result.snapshot.letters).toEqual({});
    expect(result.snapshot.seedPouch).toHaveLength(2);
    expect(result.snapshot.seedPouch[1]?.tier).toBe("common");
    expect(result.snapshot.seedPouch[1]?.sourceEventId).toMatch(/^recycle:/);
  });

  it("recycles floor(n/3)*3 letters and leaves the remainder in inventory", () => {
    const snap = { ...emptyGardenSnapshot(), letters: { A: 2, B: 3, C: 2 } };
    const result = recycleLetters(snap, { A: 2, B: 3, C: 2 }, 1000);

    expect(result).toMatchObject({
      ok: true,
      lettersConsumed: 6,
      seedsGranted: 2,
    });
    if (!result.ok) return;

    expect(result.snapshot.letters).toEqual({ C: 1 });
    expect(result.snapshot.seedPouch).toHaveLength(3);
  });

  it("rejects selections larger than the tray", () => {
    const snap = { ...emptyGardenSnapshot(), letters: { A: 2 } };
    expect(recycleLetters(snap, { A: 3 })).toEqual({
      ok: false,
      reason: "invalid_selection",
    });
  });

  it("rejects fewer than 3 selected letters", () => {
    const snap = { ...emptyGardenSnapshot(), letters: { A: 5 } };
    expect(recycleLetters(snap, { A: 2 })).toEqual({
      ok: false,
      reason: "not_enough_letters",
    });
  });

  it("rejects empty selection", () => {
    const snap = { ...emptyGardenSnapshot(), letters: { A: 5 } };
    expect(recycleLetters(snap, {})).toEqual({
      ok: false,
      reason: "nothing_to_recycle",
    });
  });

  it("keeps leftover selection after partial batch consumption", () => {
    const selection = { A: 3, B: 2 };
    const result = recycleLetters(
      { ...emptyGardenSnapshot(), letters: { A: 3, B: 2 } },
      selection,
      1000,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(subtractConsumedFromSelection(selection, result.consumed)).toEqual({
      B: 2,
    });
  });
});

describe("selectionToLetterList", () => {
  it("sorts letters deterministically", () => {
    expect(selectionToLetterList({ B: 1, A: 2 })).toEqual(["A", "A", "B"]);
  });
});
