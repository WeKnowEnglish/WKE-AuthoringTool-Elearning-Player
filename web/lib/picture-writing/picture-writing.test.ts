import { describe, expect, it } from "vitest";
import {
  checkPictureWritingResponse,
  createSamplePictureWritingDocument,
  isPictureWritingActivityReady,
  isPictureWritingPromptReady,
  pictureWritingStubPack,
  validatePictureWritingDocument,
} from "@/lib/picture-writing";

describe("picture writing module", () => {
  it("validates the HT1 sample", () => {
    const doc = createSamplePictureWritingDocument();
    expect(doc.prompts).toHaveLength(4);
    expect(pictureWritingStubPack(doc).kind).toBe("picture-writing-pack");
  });

  it("checks sentence basics against required words", () => {
    const doc = createSamplePictureWritingDocument();
    const prompt = doc.prompts[0]!;
    const pass = checkPictureWritingResponse(
      "The visitors saw the snowy mountain.",
      prompt,
    );
    expect(pass).toEqual({
      capitalLetter: true,
      endingPunctuation: true,
      minimumWords: true,
      requiredWords: true,
      wordCount: 6,
    });
    expect(isPictureWritingPromptReady(pass)).toBe(true);

    const fail = checkPictureWritingResponse("visitors mountain", prompt);
    expect(isPictureWritingPromptReady(fail)).toBe(false);
  });

  it("reports activity readiness across all prompts", () => {
    const doc = createSamplePictureWritingDocument();
    expect(isPictureWritingActivityReady(doc, {})).toBe(false);
    expect(
      isPictureWritingActivityReady(doc, {
        "write-mountain": "The visitors saw the snowy mountain.",
        "write-garage": "The man found a messy garage today.",
        "write-television": "The child watched television with his grandfather.",
        "write-craft": "The girls made models together today.",
      }),
    ).toBe(true);
  });

  it("rejects empty prompt lists", () => {
    expect(() =>
      validatePictureWritingDocument({
        version: 1,
        kind: "picture-writing",
        id: "empty",
        title: "Empty",
        instructions: "Write.",
        prompts: [],
      }),
    ).toThrow(/at least one prompt/);
  });
});
