import { describe, expect, it } from "vitest";
import {
  interactionHeroImageFrameStyle,
  interactionImageFitClass,
} from "./shared";

describe("interactionImageFitClass", () => {
  it("uses white mat for default contain", () => {
    expect(interactionImageFitClass("contain")).toContain("bg-white");
    expect(interactionImageFitClass("contain")).not.toContain("mix-blend-multiply");
  });

  it("uses multiply on vocab stage contain", () => {
    expect(interactionImageFitClass("contain", { vocabStage: true })).toContain(
      "mix-blend-multiply",
    );
    expect(interactionImageFitClass("contain", { vocabStage: true })).not.toContain("bg-white");
  });

  it("does not multiply cover images on vocab stage", () => {
    expect(interactionImageFitClass("cover", { vocabStage: true })).not.toContain(
      "mix-blend-multiply",
    );
  });
});

describe("interactionHeroImageFrameStyle", () => {
  it("returns stage blue for vocab", () => {
    expect(interactionHeroImageFrameStyle({ vocabStage: true })).toEqual({
      backgroundColor: "#dbeafe",
    });
  });
});
