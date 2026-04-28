import { describe, expect, it } from "vitest";
import { bumpTapSpeechCounter, resolveTapSpeechEntry } from "@/lib/story-tap-speech";

describe("resolveTapSpeechEntry", () => {
  it("picks lowest priority eligible entry first", () => {
    const r = resolveTapSpeechEntry({
      entries: [
        { id: "a", priority: 20, text: "A" },
        { id: "b", priority: 10, text: "B" },
      ],
      activePhaseId: "p1",
      itemId: "item",
      counters: {},
    });
    expect(r?.entry.id).toBe("b");
  });

  it("prefers phase-specific entries over default by priority", () => {
    const r = resolveTapSpeechEntry({
      entries: [
        { id: "default", priority: 50, text: "Any" },
        { id: "phase", priority: 10, text: "P1", phase_ids: ["p1"] },
      ],
      activePhaseId: "p1",
      itemId: "item",
      counters: {},
    });
    expect(r?.entry.id).toBe("phase");
  });

  it("falls through exhausted entries and repeats final priority forever", () => {
    const counters = {
      "p1:item:first": 1,
      "p1:item:second": 1,
    };
    const r = resolveTapSpeechEntry({
      entries: [
        { id: "first", priority: 1, text: "one", phase_ids: ["p1"], max_plays: 1 },
        { id: "second", priority: 2, text: "two", phase_ids: ["p1"], max_plays: 1 },
      ],
      activePhaseId: "p1",
      itemId: "item",
      counters,
    });
    expect(r?.entry.id).toBe("second");
    expect(r?.repeatFinalPriority).toBe(true);

    const next = bumpTapSpeechCounter(counters, r ?? null);
    expect(next).toEqual(counters);
  });

  it("increments counters until max_plays is reached", () => {
    const initial = resolveTapSpeechEntry({
      entries: [{ id: "x", priority: 1, text: "x", max_plays: 2 }],
      activePhaseId: "p1",
      itemId: "item",
      counters: {},
    });
    const c1 = bumpTapSpeechCounter({}, initial);
    expect(c1["p1:item:x"]).toBe(1);
    const second = resolveTapSpeechEntry({
      entries: [{ id: "x", priority: 1, text: "x", max_plays: 2 }],
      activePhaseId: "p1",
      itemId: "item",
      counters: c1,
    });
    const c2 = bumpTapSpeechCounter(c1, second);
    expect(c2["p1:item:x"]).toBe(2);
  });
});
