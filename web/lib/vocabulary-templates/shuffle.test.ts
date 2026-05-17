import { describe, expect, it } from "vitest";
import { pickNWithSeed, shuffleWithSeed } from "./shuffle";

describe("vocabulary-templates shuffle", () => {
  const items = ["a", "b", "c", "d", "e", "f", "g", "h"];

  it("shuffleWithSeed is stable for the same seed", () => {
    expect(shuffleWithSeed(items, "run-1")).toEqual(shuffleWithSeed(items, "run-1"));
  });

  it("shuffleWithSeed differs for different seeds", () => {
    const a = shuffleWithSeed(items, "run-1").join(",");
    const b = shuffleWithSeed(items, "run-2").join(",");
    expect(a).not.toBe(b);
  });

  it("pickNWithSeed returns n items deterministically", () => {
    const picked = pickNWithSeed(items, 6, "breakfast:practice");
    expect(picked).toHaveLength(6);
    expect(pickNWithSeed(items, 6, "breakfast:practice")).toEqual(picked);
    expect(new Set(picked).size).toBe(6);
  });
});
