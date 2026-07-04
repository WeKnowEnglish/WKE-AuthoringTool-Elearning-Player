import { describe, expect, it } from "vitest";
import { buildAiGenerationDiagnostics } from "@/lib/ai/ai-generation-diagnostics";
import { buildLanguageQualityIssues } from "@/lib/ai/orchestrate-teacher-lesson";

describe("AI language-quality diagnostics", () => {
  it("reports language issues on valid generated screens", () => {
    const issues = buildLanguageQualityIssues([
      {
        screen_type: "interaction",
        payload: {
          type: "interaction",
          subtype: "true_false",
          statement: "This is an eggs.",
          correct: false,
          picture_truth_statement: "We eat milk for breakfast.",
        },
      },
    ]);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          screenIndex: 0,
          screen_type: "interaction",
          severity: "error",
          code: "broken_article_noun_agreement",
          role: "question",
        }),
        expect.objectContaining({
          screenIndex: 0,
          screen_type: "interaction",
          severity: "error",
          code: "wrong_meal_verb",
          role: "feedback",
        }),
      ]),
    );
  });

  it("serializes language-quality counts with generation diagnostics", () => {
    const diagnostics = buildAiGenerationDiagnostics({
      modelScreensArrayLength: 1,
      validatedScreenCount: 1,
      returnedScreenCount: 1,
      parseWarnings: [],
      failedScreens: [],
      languageQualityIssues: [
        {
          screenIndex: 0,
          screen_type: "interaction",
          path: "payload.statement",
          role: "question",
          text: "This is an eggs.",
          severity: "error",
          code: "broken_article_noun_agreement",
          message: "The line models incorrect A1 article, number, or noun agreement.",
        },
        {
          screenIndex: 0,
          screen_type: "story",
          path: "payload.body_text",
          role: "story_text",
          text: "Tap the red school bag",
          severity: "warning",
          code: "missing_sentence_punctuation",
          message: "Sentence-like student-facing text should end with punctuation.",
        },
      ],
    });

    expect(diagnostics.languageQualityIssueCount).toBe(2);
    expect(diagnostics.languageQualityErrorCount).toBe(1);
    expect(diagnostics.languageQualityWarningCount).toBe(1);
    expect(diagnostics.languageQualityIssues[0].text).toBe("This is an eggs.");
  });
});
