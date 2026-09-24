import { describe, expect, it } from "vitest";
import { DEFAULT_CHARACTER_CONFIG } from "@/lib/character/character-defaults";
import { nearestSchoolSpecial } from "./school-specials";
import { buildClothesPrompt, buildDeskPrompt, buildFridgePrompt, buildWorldPrompt } from "./world-prompts";

describe("world prompts", () => {
  it("builds a three-choice clothing prompt from the outfit", () => {
    const prompt = buildClothesPrompt(DEFAULT_CHARACTER_CONFIG);
    expect(prompt.choices).toHaveLength(3);
    expect(prompt.choices.some((choice) => choice.id === prompt.answerId)).toBe(true);
    expect(prompt.question.toLowerCase()).toContain("wearing");
  });

  it("keeps fridge and desk prompts kid-simple", () => {
    expect(buildFridgePrompt().answerId).toBe("milk");
    expect(buildDeskPrompt().answerId).toBe("desk");
    expect(buildWorldPrompt("board").answerId).toBe("board");
  });
});

describe("school specials", () => {
  it("finds the teacher desk and board", () => {
    expect(nearestSchoolSpecial(0, -2.2)).toBe("desk");
    expect(nearestSchoolSpecial(0, -4.6)).toBe("board");
    expect(nearestSchoolSpecial(0, 3)).toBeNull();
  });
});
