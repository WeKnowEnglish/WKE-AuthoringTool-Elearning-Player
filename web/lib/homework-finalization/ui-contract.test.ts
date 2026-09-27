import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(path, "utf8");

describe("homework finalization UI contract", () => {
  it("announces writing submission and prevents another tap while pending", () => {
    const file = source("components/homework/HomeworkWritingPromptPlayer.tsx");
    expect(file).toContain('disabled={locked || saving');
    expect(file).toContain('"Submitting…"');
    expect(file).toContain('role="status"');
  });

  it("announces collection and graded-track outcomes and disables pending controls", () => {
    for (const path of [
      "components/homework/HomeworkCollectionPlayer.tsx",
      "components/homework/GradedTrackPlayer.tsx",
    ]) {
      const file = source(path);
      expect(file).toContain('disabled={pending');
      expect(file).toContain('"Submitting…"');
      expect(file).toContain('aria-live="polite"');
    }
  });

  it("announces template submission immediately", () => {
    const primary = source("components/pilots/HomeworkTemplateOnePilot.tsx");
    const secondary = source("components/secondary/SecondaryHomeworkOneShell.tsx");
    expect(primary).toContain('setCompletionNotice("Submitting your work…")');
    expect(primary).toContain('aria-live="polite"');
    expect(secondary).toContain('role="status"');
    expect(secondary).toContain("disabled={pending");
  });
});
