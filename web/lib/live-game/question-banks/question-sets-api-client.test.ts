import { describe, expect, it } from "vitest";
import {
  formatQuestionSetCountLabel,
  totalQuestionCount,
} from "@/lib/live-game/question-banks/question-set-card-utils";
import {
  DEFAULT_LIVE_GAME_QUESTION_SET_UUID,
  LIVE_GAME_SYSTEM_SET_UUIDS,
  normalizeQuestionSetRefForSession,
} from "@/lib/live-game/question-banks/question-set-ids";

describe("live-game question set card utils", () => {
  it("sums bank counts", () => {
    expect(totalQuestionCount({ harvestCount: 60, depositCount: 60, craftCount: 1 })).toBe(121);
  });

  it("formats count labels", () => {
    expect(formatQuestionSetCountLabel({ level: "A2", questionCount: 121 })).toBe(
      "A2 · 121 questions",
    );
    expect(formatQuestionSetCountLabel({ level: "A1", questionCount: 1 })).toBe("A1 · 1 question");
  });
});

describe("live-game question set session id normalization", () => {
  it("maps legacy slug to uuid", () => {
    expect(normalizeQuestionSetRefForSession("grade56-adjectives")).toBe(
      LIVE_GAME_SYSTEM_SET_UUIDS["grade56-adjectives"],
    );
  });

  it("keeps canonical uuid", () => {
    expect(normalizeQuestionSetRefForSession(DEFAULT_LIVE_GAME_QUESTION_SET_UUID)).toBe(
      DEFAULT_LIVE_GAME_QUESTION_SET_UUID,
    );
  });
});
