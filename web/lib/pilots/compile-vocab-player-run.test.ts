import { describe, expect, it } from "vitest";
import { compileVocabPlayerRun } from "@/lib/pilots/compile-vocab-player-run";
import {
  buildVocabPlayerPoolDocument,
  buildVocabPlayerThemePool,
  filterImageReadyEntries,
  isVocabEntryImageReady,
  listVocabPlayerTopThemes,
} from "@/lib/pilots/vocab-player-pool";

describe("compileVocabPlayerRun", () => {
  it("samples 6 image-ready words and builds the fixed spine", () => {
    const run = compileVocabPlayerRun({ seed: "unit-test-seed-1", themeId: "set:food_meals" });
    expect(run.entries).toHaveLength(6);
    expect(run.practiceWords).toHaveLength(6);
    expect(run.entries.every(isVocabEntryImageReady)).toBe(true);
    expect(run.lessonId.startsWith("vocab-player-")).toBe(true);

    const subtypes = run.screens.map((s) => {
      const p = s.payload as { subtype?: string };
      return p.subtype;
    });
    expect(subtypes.filter((s) => s === "flashcards").length).toBeGreaterThanOrEqual(1);
    expect(subtypes.filter((s) => s === "letter_mixup").length).toBe(6);
    expect(subtypes.filter((s) => s === "line_match").length).toBe(1);
    expect(subtypes.filter((s) => s === "mc_quiz").length).toBe(6);
    expect(subtypes.filter((s) => s === "listen_and_choose").length).toBe(6);
  });

  it("keeps incomplete media on the bank but not in the quiz sample", () => {
    const bank = buildVocabPlayerThemePool("set:farm_animals");
    expect(bank.entries.length).toBe(15);
    expect(filterImageReadyEntries(bank.entries).length).toBeLessThan(6);
    expect(() =>
      compileVocabPlayerRun({ seed: "farm-blocked", themeId: "set:farm_animals" }),
    ).toThrow(/pictures/i);
  });

  it("line_match pairs words with pictures", () => {
    const run = compileVocabPlayerRun({
      seed: "line-match-images",
      themeId: "set:clothes_everyday",
    });
    const match = run.screens.find(
      (s) => (s.payload as { subtype?: string }).subtype === "line_match",
    );
    expect(match).toBeDefined();
    const payload = match!.payload as {
      body_text?: string;
      zones: Array<{ image_url?: string }>;
    };
    expect(payload.body_text).toMatch(/picture/i);
    expect(payload.zones.length).toBe(6);
    expect(payload.zones.every((zone) => zone.image_url?.trim())).toBe(true);
    expect(payload.zones.every((zone) => !zone.image_url!.includes("placehold.co"))).toBe(
      true,
    );
  });

  it("mc_quiz and listen_and_choose screens auto-advance", () => {
    const run = compileVocabPlayerRun({ seed: "mc-auto-advance", themeId: "hub:food" });
    const autoAdvanceSubtypes = new Set(["mc_quiz", "listen_and_choose"]);
    const screens = run.screens.filter((s) =>
      autoAdvanceSubtypes.has((s.payload as { subtype?: string }).subtype ?? ""),
    );
    expect(screens.length).toBe(12);
    for (const screen of screens) {
      const payload = screen.payload as {
        auto_advance_on_pass?: boolean;
        vocab_word_id?: string;
      };
      expect(payload.auto_advance_on_pass).toBe(true);
      expect(payload.vocab_word_id?.trim()).toBeTruthy();
    }
  });

  it("is deterministic for the same seed + theme", () => {
    const a = compileVocabPlayerRun({ seed: "same-seed", themeId: "set:weather_words" });
    const b = compileVocabPlayerRun({ seed: "same-seed", themeId: "set:weather_words" });
    expect(a.entries.map((e) => e.id)).toEqual(b.entries.map((e) => e.id));
    expect(a.screens.length).toBe(b.screens.length);
  });

  it("prefers adaptive word ids among image-ready entries", () => {
    const bank = buildVocabPlayerThemePool("set:food_meals");
    const ready = filterImageReadyEntries(bank.entries);
    const preferred = ready.slice(0, 3).map((e) => e.id);
    const run = compileVocabPlayerRun({
      seed: "adaptive-pref",
      pool: bank,
      preferredWordIds: preferred,
    });
    const pickedIds = new Set(run.entries.map((e) => e.id));
    for (const id of preferred) {
      expect(pickedIds.has(id)).toBe(true);
    }
  });

  it("default pool is larger than 6 and themes are listed", () => {
    expect(buildVocabPlayerPoolDocument().entries.length).toBeGreaterThan(6);
    const themes = listVocabPlayerTopThemes();
    expect(themes.some((t) => t.id === "hub:food")).toBe(true);
    expect(themes.some((t) => t.id === "set:clothes_everyday")).toBe(true);
  });
});
