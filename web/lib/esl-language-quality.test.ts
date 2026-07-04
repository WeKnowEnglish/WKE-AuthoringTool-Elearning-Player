import { describe, expect, it } from "vitest";
import { parseScreenPayload } from "@/lib/lesson-schemas-player";
import {
  collectStudentFacingLanguage,
  summarizeStudentFacingLanguageSurfaces,
  validateStudentFacingLanguage,
} from "@/lib/esl-language-quality";

describe("student-facing ESL language quality", () => {
  it("collects student-facing surfaces by role", () => {
    const parsed = parseScreenPayload("interaction", {
      type: "interaction",
      subtype: "mc_quiz",
      body_text: "Look and choose.",
      question: "What is it?",
      options: [
        { id: "a", label: "An apple" },
        { id: "b", label: "A banana" },
      ],
      correct_option_id: "a",
    });

    expect(parsed).not.toBeNull();
    const surfaces = collectStudentFacingLanguage(parsed!);
    expect(surfaces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "payload.body_text", role: "story_text" }),
        expect.objectContaining({ path: "payload.question", role: "question" }),
        expect.objectContaining({
          path: "payload.options[0].label",
          role: "answer_choice",
        }),
      ]),
    );
  });

  it("flags grammar patterns that should never be modeled to A1 students", () => {
    const parsed = parseScreenPayload("interaction", {
      type: "interaction",
      subtype: "true_false",
      statement: "This is an eggs.",
      correct: false,
      picture_truth_statement: "We eat milk for breakfast.",
    });

    expect(parsed).not.toBeNull();
    const issues = validateStudentFacingLanguage(parsed!);
    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "broken_article_noun_agreement",
        "wrong_meal_verb",
      ]),
    );
    expect(issues.filter((issue) => issue.severity === "error")).toHaveLength(2);
  });

  it("normalizes spacing before the player displays parsed lesson text", () => {
    const parsed = parseScreenPayload("interaction", {
      type: "interaction",
      subtype: "short_answer",
      prompt: "Write   one word  .",
      acceptable_answers: ["apple"],
    });

    expect(parsed).toMatchObject({
      type: "interaction",
      subtype: "short_answer",
      prompt: "Write one word.",
    });
  });

  it("collects and normalizes learner-visible array choices", () => {
    const parsed = parseScreenPayload("interaction", {
      type: "interaction",
      subtype: "fill_blanks",
      body_text: "Choose the missing word.",
      template: "I see a __animal__.",
      blanks: [{ id: "animal", acceptable: ["cat"] }],
      word_bank: ["cat  .", "dog"],
    });

    expect(parsed).not.toBeNull();
    expect(parsed).toMatchObject({
      word_bank: ["cat.", "dog"],
    });
    expect(collectStudentFacingLanguage(parsed!)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "payload.word_bank[0]",
          role: "answer_choice",
          text: "cat.",
        }),
      ]),
    );
  });

  it("collects visible nested choices from newer interaction payloads", () => {
    const parsed = parseScreenPayload("interaction", {
      type: "interaction",
      subtype: "word_shape_hunt",
      prompt: "Find the word.",
      shape_layout: "line",
      word_chunks: [
        { id: "a", text: "apple", is_vocab: true },
        { id: "b", text: "red", is_vocab: false },
      ],
    });

    expect(parsed).not.toBeNull();
    expect(collectStudentFacingLanguage(parsed!)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "payload.word_chunks[0].text",
          role: "answer_choice",
        }),
      ]),
    );
  });

  it("summarizes lesson language surfaces for future teacher review", () => {
    const story = parseScreenPayload("story", {
      type: "story",
      body_text: "Mia finds a red bag.",
      read_aloud_text: "Mia finds a red bag.",
      pages: [
        {
          id: "page_1",
          body_text: "Mia says hello.",
          read_aloud_text: "Mia says hello.",
          phases: [
            {
              id: "tap_bag",
              is_start: true,
              next_phase_id: null,
              dialogue: {
                start: "Tap the bag.",
                success: "Great! It is a bag.",
                error: "Try again.",
              },
              completion: { type: "end_phase" },
            },
          ],
          items: [],
        },
      ],
    });
    const quiz = parseScreenPayload("interaction", {
      type: "interaction",
      subtype: "mc_quiz",
      question: "What does Mia tap?",
      options: [
        { id: "bag", label: "The bag" },
        { id: "cat", label: "The cat" },
      ],
      correct_option_id: "bag",
    });

    expect(story).not.toBeNull();
    expect(quiz).not.toBeNull();
    const summary = summarizeStudentFacingLanguageSurfaces([story!, quiz!]);
    expect(summary.story_text).toBeGreaterThanOrEqual(2);
    expect(summary.tts_text).toBeGreaterThanOrEqual(2);
    expect(summary.dialogue).toBeGreaterThanOrEqual(1);
    expect(summary.feedback).toBeGreaterThanOrEqual(2);
    expect(summary.answer_choice).toBe(2);
  });
});
