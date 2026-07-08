import { describe, expect, it } from "vitest";
import { loadPosterModuleForEditor, PosterEditorLoadError } from "./load-poster-module-for-editor";

describe("load-poster-module-for-editor", () => {
  it("loads a published poster by slug", () => {
    const loaded = loadPosterModuleForEditor("there-is-there-are-questions-a1");
    expect(loaded.slug).toBe("there-is-there-are-questions-a1");
    expect(loaded.sourceFile).toBe("there-is-there-are-poster-a1.json");
    expect(loaded.raw).toBeTruthy();
  });

  it("throws for unknown slug", () => {
    expect(() => loadPosterModuleForEditor("missing-slug")).toThrow(PosterEditorLoadError);
  });
});
