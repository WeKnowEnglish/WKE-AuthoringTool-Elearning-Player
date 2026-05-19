import { describe, expect, it } from "vitest";
import { DEMO_AM_WITH_I } from "./scripts/demo-am-with-i";
import { LIKE_LIKES_FOOD } from "./scripts/like-likes-food";
import { buildPresenterSteps, validatePuppetScript } from "./validate";
import { tokenizeLineForReveal } from "./types";

describe("puppet-activity validate", () => {
  it("demo script is valid", () => {
    expect(validatePuppetScript(DEMO_AM_WITH_I)).toEqual([]);
  });

  it("like/likes food script is valid", () => {
    expect(validatePuppetScript(LIKE_LIKES_FOOD)).toEqual([]);
  });

  it("builds presenter steps from lines and quiz", () => {
    const steps = buildPresenterSteps(DEMO_AM_WITH_I);
    expect(steps.some((s) => s.type === "line")).toBe(true);
    expect(steps[steps.length - 1]?.type).toBe("quiz");
  });

  it("builds choice step for like/likes script", () => {
    const steps = buildPresenterSteps(LIKE_LIKES_FOOD);
    expect(steps.some((s) => s.type === "choice")).toBe(true);
    expect(steps[steps.length - 1]?.type).toBe("quiz");
  });

  it("tokenizeLineForReveal keeps punctuation on words", () => {
    expect(tokenizeLineForReveal("We use am with I.")).toEqual([
      "We",
      "use",
      "am",
      "with",
      "I.",
    ]);
  });
});
