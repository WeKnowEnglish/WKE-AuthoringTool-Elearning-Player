import { describe, expect, it } from "vitest";
import { listeningItemMatchCountIssues } from "@/lib/listening-item-match/limits";

describe("listeningItemMatchCountIssues", () => {
  it("allows extra choices as distractors", () => {
    expect(
      listeningItemMatchCountIssues({ promptCount: 3, choiceCount: 5 }),
    ).toEqual([]);
  });

  it("rejects more prompts than choices", () => {
    expect(
      listeningItemMatchCountIssues({ promptCount: 4, choiceCount: 3 }),
    ).toContain(
      "You need at least as many choices as prompts (extra choices can be distractors).",
    );
  });
});
