import { describe, expect, it } from "vitest";
import { LIKE_LIKES_FOOD } from "./scripts/like-likes-food";
import { buildPresenterSteps } from "./validate";
import { computeVisibleLineSteps } from "./visible-captions";

describe("computeVisibleLineSteps", () => {
  const steps = buildPresenterSteps(LIKE_LIKES_FOOD);

  it("shows only the active ephemeral line for early intro", () => {
    const visible = computeVisibleLineSteps(steps, 0, "line");
    expect(visible).toHaveLength(1);
    expect(visible[0]?.beat.text).toBe("Hi!");
  });

  it("drops previous ephemeral when advancing intro", () => {
    const visible = computeVisibleLineSteps(steps, 1, "line");
    expect(visible).toHaveLength(1);
    expect(visible[0]?.beat.text).toContain("Today we learn");
  });

  it("hides line captions during choice", () => {
    const choiceIndex = steps.findIndex((s) => s.type === "choice");
    expect(choiceIndex).toBeGreaterThan(-1);
    expect(computeVisibleLineSteps(steps, choiceIndex, "choice")).toHaveLength(0);
  });

  it("keeps both persist labels after both are introduced", () => {
    const likesIndex = steps.findIndex(
      (s) => s.type === "line" && s.beat.text === "likes",
    );
    expect(likesIndex).toBeGreaterThan(-1);

    const atLikes = computeVisibleLineSteps(steps, likesIndex, "line");
    const texts = atLikes.map((s) => s.beat.text);
    expect(texts).toContain("like");
    expect(texts).toContain("likes");
    expect(texts).not.toContain("Hi!");
  });

  it("does not stack label and example in the same caption slot", () => {
    const iLikeIndex = steps.findIndex(
      (s) => s.type === "line" && s.beat.text === "I like {{food}}.",
    );
    expect(iLikeIndex).toBeGreaterThan(-1);

    const visible = computeVisibleLineSteps(steps, iLikeIndex, "line");
    const texts = visible.map((s) => s.beat.text);
    expect(texts).toContain("I like {{food}}.");
    expect(texts).not.toContain("like");
    expect(texts).toContain("likes");
  });

  it("hides likes label while She likes example is active in right slot", () => {
    const sheLikesIndex = steps.findIndex(
      (s) => s.type === "line" && s.beat.text === "She likes {{food}}.",
    );
    const visible = computeVisibleLineSteps(steps, sheLikesIndex, "line");
    const texts = visible.map((s) => s.beat.text);
    expect(texts).toContain("She likes {{food}}.");
    expect(texts).toContain("like");
    expect(texts).not.toContain("likes");
  });

  it("hides captions on quiz", () => {
    const quizIndex = steps.findIndex((s) => s.type === "quiz");
    expect(computeVisibleLineSteps(steps, quizIndex, "quiz")).toHaveLength(0);
  });
});
