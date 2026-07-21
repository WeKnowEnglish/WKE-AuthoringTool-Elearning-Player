import { describe, expect, it } from "vitest";
import { buildPrimaryReviewModel } from "./build-primary-review-model";

describe("buildPrimaryReviewModel", () => {
  it("returns an empty review list when mastery is empty", () => {
    const model = buildPrimaryReviewModel();
    expect(model.items).toEqual([]);
    expect(model.dueCount).toBe(0);
    expect(model.fragileCount).toBe(0);
  });
});
