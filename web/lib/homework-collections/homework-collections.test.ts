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

  it("scores listen and match prompts against shared choices", () => {
    const part = createHomeworkCollectionPart("listening_item_match", "listen-match");
    if (part.kind !== "listening_item_match") throw new Error("Expected listen and match");
    part.activity.audioText = "Mia painted. Ethan rode his bike.";
    const [firstPrompt, secondPrompt] = part.activity.prompts;
    const firstChoice = part.activity.choices.find(
      (choice) => choice.id === firstPrompt!.correctChoiceId,
    );
    expect(firstChoice).toBeTruthy();
    const document = { version: 1 as const, parts: [part] };
    const content = scoreHomeworkCollectionAttempt(document, {
      "listen-match": {
        answers: {
          [firstPrompt!.id]: firstPrompt!.correctChoiceId,
          [secondPrompt!.id]: "wrong-choice-id",
        },
      },
    });
    expect(content.parts["listen-match"]?.correct).toBe(1);
    expect(content.parts["listen-match"]?.itemCount).toBe(5);
  });

  it("reports blank required content for every collection activity without throwing", () => {
    const multipleChoice = createHomeworkCollectionPart("multiple_choice", "mc-blank");
    const letters = createHomeworkCollectionPart("letter_mixup", "letters-blank");
    const matching = createHomeworkCollectionPart("line_match", "match-blank");
    const listening = createHomeworkCollectionPart("listen_and_choose", "listen-blank");
    const listenMatch = createHomeworkCollectionPart("listening_item_match", "listen-match-blank");
    const sentence = createHomeworkCollectionPart("sentence_scramble", "sentence-blank");
    const response = createHomeworkCollectionPart("free_response", "response-blank");

    if (multipleChoice.kind === "multiple_choice") {
      multipleChoice.questions[0]!.options[0]!.text = "";
    }
    if (letters.kind === "letter_mixup") letters.items[0]!.targetWord = "";
    if (matching.kind === "line_match") matching.pairs[0]!.right = "";
    if (listening.kind === "listen_and_choose") listening.items[0]!.speakText = "";
    if (listenMatch.kind === "listening_item_match") listenMatch.activity.audioText = "";
    if (sentence.kind === "sentence_scramble") sentence.items[0]!.sentence = "";
    if (response.kind === "free_response") response.prompts[0]!.prompt = "";

    for (const part of [
      multipleChoice,
      letters,
      matching,
      listening,
      listenMatch,
      sentence,
      response,
    ]) {
      expect(homeworkCollectionPartValidationIssues(part).length).toBeGreaterThan(0);
    }
  });

  it("scores speaking prompts for teacher review when a recording id is saved", () => {
    const speaking = createHomeworkCollectionPart("speaking_prompt", "speak");
    if (speaking.kind !== "speaking_prompt") throw new Error("Expected speaking");
    speaking.prompt = "Describe your weekend.";
    const document = parseHomeworkCollectionDocument({ version: 1, parts: [speaking] });
    expect(document?.parts).toHaveLength(1);

    const withoutRecording = scoreHomeworkCollectionAttempt(document!, {
      speak: { answers: {} },
    });
    expect(withoutRecording.parts.speak?.correct).toBeNull();
    expect(homeworkCollectionRequiredPartsComplete(document!, withoutRecording)).toBe(false);

    const withRecording = scoreHomeworkCollectionAttempt(document!, {
      speak: { answers: { [speaking.responseId]: "recording-uuid" } },
    });
    expect(withRecording.parts.speak?.correct).toBeNull();
    expect(withRecording.parts.speak?.answered).toBe(1);
    expect(homeworkCollectionRequiredPartsComplete(document!, withRecording)).toBe(true);
    expect(homeworkCollectionAttemptTotals(withRecording).manualMaxScore).toBe(5);
  });
});
