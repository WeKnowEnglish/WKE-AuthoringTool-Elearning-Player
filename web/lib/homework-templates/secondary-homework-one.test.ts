import { describe, expect, it } from "vitest";
import {
  normalizeSecondaryAnswer,
  parseSecondaryCorrectionsAuthoringSection,
  parseSecondaryCorrectionsSection,
  parseSecondaryDialogueAuthoringSection,
  parseSecondaryQuestionsAuthoringSection,
  parseSecondarySequenceAuthoringSection,
  parseSecondarySpeakingAuthoringSection,
  scoreSecondaryAnswers,
  scoreSequence,
  SECONDARY_HOMEWORK_ONE,
  sequenceAnswers,
  sequenceFromAnswers,
} from "@/lib/homework-templates/secondary-homework-one";

describe("Secondary Homework One", () => {
  it("scores the event sequence by position", () => {
    expect(scoreSequence(["C", "D", "A", "B", "E"])).toBe(5);
    expect(scoreSequence(["A", "B", "C", "D", "E"])).toBe(1);
  });

  it("scores against an edited correctOrder when provided", () => {
    expect(scoreSequence(["A", "B", "C", "D", "E"], ["A", "B", "C", "D", "E"])).toBe(5);
    expect(scoreSequence(["C", "D", "A", "B", "E"], ["A", "B", "C", "D", "E"])).toBe(1);
  });

  it("round-trips a saved sequence", () => {
    const order = ["C", "D", "A", "B", "E"];
    expect(sequenceFromAnswers(sequenceAnswers(order))).toEqual(order);
  });

  it("rebuilds sequence from answers using edited event ids", () => {
    const reading = {
      events: [{ id: "X" }, { id: "Y" }, { id: "Z" }],
      correctOrder: ["Z", "X", "Y"],
    };
    expect(sequenceFromAnswers({ X: "2", Y: "3", Z: "1" }, reading)).toEqual([
      "Z",
      "X",
      "Y",
    ]);
  });

  it("normalizes case, whitespace, and curly apostrophes", () => {
    expect(normalizeSecondaryAnswer("  Didn’t   THINK ")).toBe("didn't think");
  });

  it("accepts contracted and full negative forms", () => {
    const line = SECONDARY_HOMEWORK_ONE.dialogue.lines[7];
    expect(scoreSecondaryAnswers({ [line.id]: "was not" }, [line])).toBe(1);
  });

  it("keeps every Secondary editor usable while required text is blank", () => {
    const sequence = structuredClone(SECONDARY_HOMEWORK_ONE.reading);
    sequence.events[0]!.text = "";
    expect(parseSecondarySequenceAuthoringSection(sequence)).not.toBeNull();

    const corrections = structuredClone(SECONDARY_HOMEWORK_ONE.corrections);
    corrections.questions[0]!.answer = "";
    expect(parseSecondaryCorrectionsAuthoringSection(corrections)).not.toBeNull();
    expect(parseSecondaryCorrectionsSection(corrections)).toBeNull();

    const correctionsWithNull = structuredClone(
      SECONDARY_HOMEWORK_ONE.corrections,
    ) as unknown as Record<string, unknown>;
    const correctionQuestions = correctionsWithNull.questions as Array<
      Record<string, unknown>
    >;
    correctionQuestions[0]!.answer = null;
    expect(
      parseSecondaryCorrectionsAuthoringSection(correctionsWithNull)?.questions[0]
        ?.answer,
    ).toBe("");

    const dialogue = structuredClone(SECONDARY_HOMEWORK_ONE.dialogue);
    dialogue.lines[0]!.answer = "";
    expect(parseSecondaryDialogueAuthoringSection(dialogue)).not.toBeNull();

    const questions = structuredClone(SECONDARY_HOMEWORK_ONE.questions);
    questions.items[0]!.choices = [];
    questions.items[0]!.answer = "";
    expect(parseSecondaryQuestionsAuthoringSection(questions)).not.toBeNull();

    const speaking = structuredClone(SECONDARY_HOMEWORK_ONE.speaking);
    speaking.planningPrompts[0] = "";
    expect(parseSecondarySpeakingAuthoringSection(speaking)).not.toBeNull();
  });
});
