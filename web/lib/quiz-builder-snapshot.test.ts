import { describe, expect, it } from "vitest";
import { generateTopicSnapshot } from "./quiz-builder-snapshot";

describe("quiz-builder-snapshot", () => {
  it("is deterministic", () => {
    const a = generateTopicSnapshot({ topic: "food", level: "A1", strictTopic: true });
    const b = generateTopicSnapshot({ topic: "food", level: "A1", strictTopic: true });
    expect(a).toEqual(b);
  });

  it("marks target mismatch correctly", () => {
    const snap = generateTopicSnapshot({ topic: "food", level: "A1", strictTopic: true });
    const anyRejected = snap.structures[0]?.vocab.find((v) => !v.accepted);
    expect(anyRejected).toBeDefined();
    expect(anyRejected?.reasons.length).toBeGreaterThan(0);
  });

  it("computes dominance ratios", () => {
    const snap = generateTopicSnapshot({ topic: "food", level: "A1", strictTopic: true });
    expect(snap.dominance.length).toBeGreaterThan(0);
    expect(snap.dominance[0]!.ratio).toBeGreaterThan(0);
  });
});
