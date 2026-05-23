import { describe, expect, it } from "vitest";
import { buildExploreWordPool } from "@/lib/explore/explore-word-pool";

describe("buildExploreWordPool", () => {
  it("dedupes gate target words into word ids", () => {
    const pool = buildExploreWordPool([
      { id: "g1", prompt: "p", target_word: "run" },
      { id: "g2", prompt: "p", target_word: "jump" },
      { id: "g3", prompt: "p", target_word: "run" },
    ]);
    expect(pool).toHaveLength(2);
    expect(pool).toContain("run");
    expect(pool).toContain("jump");
  });
});
