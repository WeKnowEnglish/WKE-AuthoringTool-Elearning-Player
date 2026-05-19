import { describe, expect, it } from "vitest";
import { canLeaveStoryScreen } from "./story-screen-navigation";

describe("canLeaveStoryScreen", () => {
  it("allows leave when no pass rule and no auto advance", () => {
    expect(
      canLeaveStoryScreen({
        hasPassRule: false,
        autoAdvanceOnPass: false,
        interactionScreenPassed: false,
        passSatisfied: false,
      }),
    ).toBe(true);
  });

  it("blocks vocab-style screens until interaction pass", () => {
    expect(
      canLeaveStoryScreen({
        hasPassRule: false,
        autoAdvanceOnPass: true,
        interactionScreenPassed: false,
        passSatisfied: false,
      }),
    ).toBe(false);
    expect(
      canLeaveStoryScreen({
        hasPassRule: false,
        autoAdvanceOnPass: true,
        interactionScreenPassed: true,
        passSatisfied: false,
      }),
    ).toBe(true);
  });

  it("allows pass_rule satisfaction without interactionScreenPassed", () => {
    expect(
      canLeaveStoryScreen({
        hasPassRule: true,
        autoAdvanceOnPass: false,
        interactionScreenPassed: false,
        passSatisfied: true,
      }),
    ).toBe(true);
  });
});
