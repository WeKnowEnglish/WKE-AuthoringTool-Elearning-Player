import { describe, expect, it } from "vitest";
import { SYSTEM_QUESTION_SET_SUMMARIES } from "@/lib/live-game/question-banks/system-seed-source";
import {
  buildSystemQuestionSetSeeds,
  EXPECTED_SYSTEM_SEED_COUNTS,
} from "@/lib/live-game/question-banks/seed-data";
import { depositSpellPayloadSchema } from "@/lib/live-game/question-banks/schemas";

describe("live-game system question set seed parity", () => {
  const seeds = buildSystemQuestionSetSeeds();

  it("builds four system sets", () => {
    expect(seeds).toHaveLength(4);
    expect(seeds.map((set) => set.slug).sort()).toEqual(
      SYSTEM_QUESTION_SET_SUMMARIES.map((summary) => summary.id).sort(),
    );
  });

  it("matches expected bank counts per set", () => {
    for (const set of seeds) {
      const harvest = set.questions.filter((question) => question.bank === "harvest");
      const deposit = set.questions.filter((question) => question.bank === "deposit");
      const craft = set.questions.filter((question) => question.bank === "craft");
      const expected = EXPECTED_SYSTEM_SEED_COUNTS[set.slug];
      expect(harvest).toHaveLength(expected.harvest);
      expect(deposit).toHaveLength(expected.deposit);
      expect(craft).toHaveLength(expected.craft);
    }
  });

  it("uses unique legacy ids per bank within each set", () => {
    for (const set of seeds) {
      for (const bank of ["harvest", "deposit", "craft"] as const) {
        const legacyIds = set.questions
          .filter((question) => question.bank === bank)
          .map((question) => question.legacySourceId);
        expect(new Set(legacyIds).size).toBe(legacyIds.length);
      }
    }
  });

  it("only uses valid deposit target words", () => {
    for (const set of seeds) {
      for (const question of set.questions.filter((entry) => entry.bank === "deposit")) {
        expect(() => depositSpellPayloadSchema.parse(question.payload)).not.toThrow();
      }
    }
  });

  it("updates craft prompts away from bridge wording for A1 sets", () => {
    for (const slug of ["daily-routines-a1", "school-life-a1", "describing-places-a1"] as const) {
      const craft = seeds
        .find((set) => set.slug === slug)!
        .questions.find((question) => question.bank === "craft");
      expect(craft?.prompt.toLowerCase()).not.toContain("bridge");
    }
  });
});
