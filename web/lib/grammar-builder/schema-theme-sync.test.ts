import { describe, expect, it } from "vitest";
import { grammarThemeIdSchema } from "./schema";
import { GRAMMAR_THEME_IDS } from "./theme-tokens";

describe("grammar theme sync", () => {
  it("matches theme token keys to schema theme ids", () => {
    const schemaIds = grammarThemeIdSchema.options.toSorted();
    const tokenIds = [...GRAMMAR_THEME_IDS].toSorted();

    expect(tokenIds).toEqual(schemaIds);
  });
});
