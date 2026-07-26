import { describe, expect, it } from "vitest";
import bakeryQuickCheck from "@/content/pilots/games-mc-quiz/bakery-quick-check.json";
import { freezeStudioPackForSpace } from "./freeze";

describe("freezeStudioPackForSpace", () => {
  it("validates and clones the pack", () => {
    const frozen = freezeStudioPackForSpace("multiple_choice", bakeryQuickCheck, "Bakery");
    expect(frozen.title).toBe("Bakery");
    expect(frozen.format).toBe("multiple_choice");
    expect(frozen.pack).toBeTruthy();
    expect(frozen.pack).not.toBe(bakeryQuickCheck);
  });
});
