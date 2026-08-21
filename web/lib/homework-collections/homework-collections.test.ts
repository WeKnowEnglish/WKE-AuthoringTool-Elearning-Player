import { describe, expect, it } from "vitest";
import {
  createHomeworkCollectionPart,
  homeworkCollectionPartValidationIssues,
  parseHomeworkCollectionDocument,
  scoreHomeworkCollectionAttempt,
  homeworkCollectionAttemptTotals,
  homeworkCollectionRequiredPartsComplete,
} from "@/lib/homework-collections";

describe("homework collections", () => {
  it("parses a mixed collection and scores automatic parts on the server contract", () => {
    const multipleChoice = createHomeworkCollectionPart("multiple_choice", "mc");
    if (multipleChoice.kind !== "multiple_choice") throw new Error("Expected MC");
    multipleChoice.questions[0]!.prompt = "Which word is correct?";
    multipleChoice.questions[0]!.correctOptionId = multipleChoice.questions[0]!.options[0]!.id;

    const response = createHomeworkCollectionPart("free_response", "free");
    const document = parseHomeworkCollectionDocument({
      version: 1,
      parts: [multipleChoice, response],
    });
    expect(document?.parts).toHaveLength(2);

    const content = scoreHomeworkCollectionAttempt(document!, {
      mc: { answers: { [multipleChoice.questions[0]!.id]: multipleChoice.questions[0]!.correctOptionId } },
      free: { answers: { [response.kind === "free_response" ? response.prompts[0]!.id : ""]: "My answer" } },
    });
    expect(content.parts.mc?.correct).toBe(1);
    expect(content.parts.free?.correct).toBeNull();
    expect(homeworkCollectionAttemptTotals(content)).toMatchObject({
      autoScore: 1,
      autoMaxScore: 1,
      manualMaxScore: 5,
    });
    expect(homeworkCollectionRequiredPartsComplete(document!, content)).toBe(true);
  });

  it("normalizes letter and sentence answers without trusting client scores", () => {
    const letters = createHomeworkCollectionPart("letter_mixup", "letters");
    const sentence = createHomeworkCollectionPart("sentence_scramble", "sentence");
    if (letters.kind !== "letter_mixup" || sentence.kind !== "sentence_scramble") {
      throw new Error("Expected automatic parts");
    }
    letters.items[0]!.targetWord = "Café";
    sentence.items[0]!.sentence = "Where is my pencil?";
    const document = { version: 1 as const, parts: [letters, sentence] };
    const content = scoreHomeworkCollectionAttempt(document, {
      letters: { answers: { [letters.items[0]!.id]: "CAFÉ" }, correct: 999 },
      sentence: { answers: { [sentence.items[0]!.id]: "Where is my pencil" } },
    });
    expect(content.parts.letters?.correct).toBe(1);
    expect(content.parts.sentence?.correct).toBe(1);
  });

  it("rejects duplicate part ids", () => {
    const part = createHomeworkCollectionPart("free_response", "same");
    expect(parseHomeworkCollectionDocument({ version: 1, parts: [part, part] })).toBeNull();
  });

  it("keeps a separate expansion prompt without changing the correct sentence", () => {
    const sentence = createHomeworkCollectionPart(
      "sentence_scramble",
      "expanded-sentence",
    );
    if (sentence.kind !== "sentence_scramble") {
      throw new Error("Expected sentence scramble");
    }
    sentence.items[0] = {
      ...sentence.items[0]!,
      promptMode: "additional_prompt",
      prompt: "Expand this idea: The cat sleeps.",
      sentence: "The tired cat sleeps peacefully on the sofa.",
    };

    const parsed = parseHomeworkCollectionDocument({
      version: 1,
      parts: [sentence],
    });
    const parsedPart = parsed?.parts[0];
    expect(parsedPart?.kind).toBe("sentence_scramble");
    if (parsedPart?.kind !== "sentence_scramble") return;
    expect(parsedPart.items[0]).toMatchObject({
      promptMode: "additional_prompt",
      prompt: "Expand this idea: The cat sleeps.",
      sentence: "The tired cat sleeps peacefully on the sofa.",
    });
  });

  it("reports blank required content for every collection activity without throwing", () => {
    const multipleChoice = createHomeworkCollectionPart("multiple_choice", "mc-blank");
    const letters = createHomeworkCollectionPart("letter_mixup", "letters-blank");
    const matching = createHomeworkCollectionPart("line_match", "match-blank");
    const listening = createHomeworkCollectionPart("listen_and_choose", "listen-blank");
    const sentence = createHomeworkCollectionPart("sentence_scramble", "sentence-blank");
    const response = createHomeworkCollectionPart("free_response", "response-blank");

    if (multipleChoice.kind === "multiple_choice") {
      multipleChoice.questions[0]!.options[0]!.text = "";
    }
    if (letters.kind === "letter_mixup") letters.items[0]!.targetWord = "";
    if (matching.kind === "line_match") matching.pairs[0]!.right = "";
    if (listening.kind === "listen_and_choose") listening.items[0]!.speakText = "";
    if (sentence.kind === "sentence_scramble") sentence.items[0]!.sentence = "";
    if (response.kind === "free_response") response.prompts[0]!.prompt = "";

    for (const part of [
      multipleChoice,
      letters,
      matching,
      listening,
      sentence,
      response,
    ]) {
      expect(homeworkCollectionPartValidationIssues(part).length).toBeGreaterThan(0);
    }
  });
});
