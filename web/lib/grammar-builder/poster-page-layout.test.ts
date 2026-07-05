import { describe, expect, it } from "vitest";
import { getPosterPageGridClass, getPosterSectionWrapperClass } from "./poster-page-layout";

describe("getPosterSectionWrapperClass", () => {
  it("spans the last card full width for two-equal-then-full", () => {
    expect(getPosterSectionWrapperClass(2, "two-equal-then-full", 3)).toBe("sm:col-span-2");
  });

  it("does not span the first cards", () => {
    expect(getPosterSectionWrapperClass(0, "two-equal-then-full", 3)).toBeUndefined();
    expect(getPosterSectionWrapperClass(1, "two-equal-then-full", 3)).toBeUndefined();
  });

  it("does not span when there are only two cards", () => {
    expect(getPosterSectionWrapperClass(1, "two-equal-then-full", 2)).toBeUndefined();
  });

  it("spans card 5+ full width for two-by-two-then-full", () => {
    expect(getPosterSectionWrapperClass(4, "two-by-two-then-full", 5)).toBe("sm:col-span-2");
    expect(getPosterSectionWrapperClass(3, "two-by-two-then-full", 5)).toBeUndefined();
  });

  it("does not span cards on four-card-grid-then-split", () => {
    expect(getPosterSectionWrapperClass(4, "four-card-grid-then-split", 6)).toBeUndefined();
    expect(getPosterSectionWrapperClass(5, "four-card-grid-then-split", 6)).toBeUndefined();
  });

  it("does not span cards on two-equal", () => {
    expect(getPosterSectionWrapperClass(2, "two-equal", 3)).toBeUndefined();
  });
});

describe("getPosterPageGridClass", () => {
  it("uses a single column for single-column layouts", () => {
    expect(getPosterPageGridClass("single-column")).toContain("grid-cols-1");
    expect(getPosterPageGridClass("single-column")).not.toContain("sm:grid-cols-2");
  });

  it("uses two columns on sm+ for two-equal-then-full", () => {
    expect(getPosterPageGridClass("two-equal-then-full")).toContain("sm:grid-cols-2");
  });

  it("uses two columns on sm+ for two-by-two-then-full", () => {
    expect(getPosterPageGridClass("two-by-two-then-full")).toContain("sm:grid-cols-2");
  });

  it("uses two columns on sm+ for four-card-grid-then-split", () => {
    expect(getPosterPageGridClass("four-card-grid-then-split")).toContain("sm:grid-cols-2");
  });
});
