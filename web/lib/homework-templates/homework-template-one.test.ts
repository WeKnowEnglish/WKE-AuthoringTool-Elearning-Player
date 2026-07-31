import { describe, expect, it } from "vitest";
import { checkPictureWriting, checkQuestionWriting, HOMEWORK_TEMPLATE_ONE, homeworkTemplateOneSchema, isPictureClozeAnswerCorrect, scoreSentenceColumns, scoreVerbTable, scoreWordAnnotations } from "@/lib/homework-templates/homework-template-one";

describe("Homework Template One", () => {
  it("defines six ordered sections", () => {
    expect(homeworkTemplateOneSchema.safeParse(HOMEWORK_TEMPLATE_ONE).success).toBe(true);
    expect(HOMEWORK_TEMPLATE_ONE.sections.map((section) => section.order)).toEqual([1, 2, 3, 4, 5, 6]);
  });
  it("starts with four picture cloze items", () => {
    const first = HOMEWORK_TEMPLATE_ONE.sections[0];
    expect(first.kind).toBe("picture_cloze");
    if (first.kind === "picture_cloze") expect(first.items).toHaveLength(4);
  });
  it("normalizes child answers", () => {
    expect(isPictureClozeAnswerCorrect(" Tape measure! ", ["tape measure"])).toBe(true);
  });
  it("scores adjective and adverb markings without rewarding extra marks", () => {
    const second = HOMEWORK_TEMPLATE_ONE.sections[1];
    expect(second.kind).toBe("word_annotation");
    if (second.kind !== "word_annotation") return;
    expect(scoreWordAnnotations(second, { "m1-favourite": "adjective", "m2-carefully": "adverb", "m1-teacher": "adjective" })).toEqual({ correct: 2, expected: 7, incorrect: 1 });
  });
  it("scores sentence pieces by their structural column", () => {
    const third = HOMEWORK_TEMPLATE_ONE.sections[2];
    expect(third.kind).toBe("sentence_columns");
    if (third.kind !== "sentence_columns") return;
    expect(scoreSentenceColumns(third, { "b1-subject": "subject", "b1-action": "extra" })).toEqual({ correct: 1, total: 12 });
  });
  it("scores missing verb cells and accepts either slash-separated form", () => {
    const fourth = HOMEWORK_TEMPLATE_ONE.sections[3];
    expect(fourth.kind).toBe("verb_table");
    if (fourth.kind !== "verb_table") return;
    expect(scoreVerbTable(fourth, { "verb-go:past": "Went", "verb-be:participle": "been" })).toEqual({ correct: 2, total: 7 });
  });
  it("checks measurable picture-writing requirements without grading quality", () => {
    const fifth = HOMEWORK_TEMPLATE_ONE.sections[4];
    expect(fifth.kind).toBe("picture_writing");
    if (fifth.kind !== "picture_writing") return;
    expect(checkPictureWriting("The visitors saw the snowy mountain.", fifth.prompts[0]!)).toEqual({ capitalLetter: true, endingPunctuation: true, minimumWords: true, requiredWords: true, wordCount: 6 });
  });
  it("checks question structure without treating it as a final quality grade", () => {
    const sixth = HOMEWORK_TEMPLATE_ONE.sections[5];
    expect(sixth.kind).toBe("question_writing");
    if (sixth.kind !== "question_writing" || sixth.status !== "ready") return;
    expect(checkQuestionWriting("Have you ever swum in a river?", sixth.prompts[0]!)).toEqual({ capitalLetter: true, questionMark: true, minimumWords: true, requiredWords: true, questionWord: true, helpingVerb: true, wordCount: 7 });
  });
});
