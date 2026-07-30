import { describe, expect, it } from "vitest";
import { compileVocabPlayerRun } from "@/lib/pilots/compile-vocab-player-run";
import { buildVocabPlayerPoolDocument } from "@/lib/pilots/vocab-player-pool";

describe("compileVocabPlayerRun", () => {
  it("samples 6 words and builds the fixed spine", () => {
    const run = compileVocabPlayerRun({ seed: "unit-test-seed-1" });
    expect(run.entries).toHaveLength(6);
    expect(run.practiceWords).toHaveLength(6);
    expect(run.lessonId.startsWith("vocab-player-")).toBe(true);

    const subtypes = run.screens.map((s) => {
      const p = s.payload as { subtype?: string };
      return p.subtype;
    });
    expect(subtypes.filter((s) => s === "flashcards").length).toBeGreaterThanOrEqual(1);
    expect(subtypes.filter((s) => s === "letter_mixup").length).toBe(6);
    expect(subtypes.filter((s) => s === "drag_match").length).toBe(1);
    expect(subtypes.filter((s) => s === "mc_quiz").length).toBe(6);
    expect(subtypes.filter((s) => s === "listen_and_choose").length).toBe(6);
  });

  it("is deterministic for the same seed", () => {
    const a = compileVocabPlayerRun({ seed: "same-seed" });
    const b = compileVocabPlayerRun({ seed: "same-seed" });
    expect(a.entries.map((e) => e.id)).toEqual(b.entries.map((e) => e.id));
    expect(a.screens.length).toBe(b.screens.length);
  });

  it("draws from a pool larger than 6", () => {
    expect(buildVocabPlayerPoolDocument().entries.length).toBeGreaterThan(6);
  });
});
