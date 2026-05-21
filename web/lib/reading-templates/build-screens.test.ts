import { describe, expect, it } from "vitest";
import { interactionPayloadSchema } from "@/lib/lesson-schemas";
import { buildReadingSetScreens } from "./build-screens";
import { READING_MIXED_ITEMS } from "./sets/example-mixed-items";
import { expectedReadingScreenCount, validateReadingSetDefinition } from "./validate";

describe("reading-templates example set", () => {
  it("validates without errors", () => {
    expect(validateReadingSetDefinition(READING_MIXED_ITEMS)).toEqual([]);
  });

  it("builds the expected screen count", () => {
    const screens = buildReadingSetScreens(READING_MIXED_ITEMS, { seed: "test-seed" });
    expect(screens).toHaveLength(expectedReadingScreenCount());
    expect(screens[0]?.screen_type).toBe("start");
    const interactions = screens.filter((s) => s.screen_type === "interaction");
    expect(interactions).toHaveLength(16);
  });

  it("shuffles cloze word bank deterministically per seed", () => {
    const seed = "cloze-bank-seed-42";
    const once = buildReadingSetScreens(READING_MIXED_ITEMS, { seed });
    const again = buildReadingSetScreens(READING_MIXED_ITEMS, { seed });
    const clozeOnce = once.find((s) => (s.payload as { subtype?: string }).subtype === "fill_blanks");
    const clozeAgain = again.find((s) => (s.payload as { subtype?: string }).subtype === "fill_blanks");
    const bank = (clozeOnce?.payload as { word_bank?: string[] }).word_bank ?? [];
    const bankRepeat = (clozeAgain?.payload as { word_bank?: string[] }).word_bank ?? [];
    expect(bank).toHaveLength(8);
    expect(bankRepeat).toEqual(bank);
    expect([...bank].sort().join()).toBe(
      [...READING_MIXED_ITEMS.cloze.wordBank].sort().join(),
    );
  });

  it("parses all interaction payloads", () => {
    const screens = buildReadingSetScreens(READING_MIXED_ITEMS, { seed: "parse-test" });
    for (const s of screens) {
      if (s.screen_type !== "interaction") continue;
      expect(interactionPayloadSchema.safeParse(s.payload).success).toBe(true);
    }
  });
});
