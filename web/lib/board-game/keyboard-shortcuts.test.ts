import { describe, expect, it } from "vitest";
import { isKeyboardGameplayBlocked } from "@/lib/board-game/keyboard-shortcuts";

describe("keyboard shortcuts", () => {
  it("blocks gameplay keys during animations", () => {
    expect(isKeyboardGameplayBlocked("diceRolling")).toBe(true);
    expect(isKeyboardGameplayBlocked("moving")).toBe(true);
    expect(isKeyboardGameplayBlocked("celebrating")).toBe(true);
    expect(isKeyboardGameplayBlocked("ready")).toBe(false);
    expect(isKeyboardGameplayBlocked("question")).toBe(false);
  });
});
