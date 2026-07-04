import { describe, expect, it } from "vitest";
import {
  auditStudentFacingStaticCopySources,
  extractStaticCopyLiteralCandidates,
} from "@/lib/student-facing-static-copy-audit";

describe("student-facing static-copy audit", () => {
  it("extracts likely student-facing literal strings from audited source text", () => {
    const candidates = extractStaticCopyLiteralCandidates({
      source: "components/student-hub/HomeRoom.tsx",
      text: `
        const className = "flex rounded-xl bg-white";
        const url = "https://example.com/image.png";
        <p>{"Start story - Bakery"}</p>
        <button title="Tap to place">Tap to place</button>
      `,
    });

    expect(candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: "Start story - Bakery" }),
        expect.objectContaining({ text: "Tap to place" }),
      ]),
    );
    expect(candidates.map((candidate) => candidate.text)).not.toContain(
      "flex rounded-xl bg-white",
    );
    expect(candidates.map((candidate) => candidate.text)).not.toContain(
      "https://example.com/image.png",
    );
  });

  it("reports unregistered copy for audited sources only", () => {
    const result = auditStudentFacingStaticCopySources({
      sources: [
        {
          source: "components/student-hub/HomeRoom.tsx",
          text: `const known = "Word practice"; const missing = "Start story now.";`,
        },
        {
          source: "components/teacher/InternalPanel.tsx",
          text: `const ignored = "Start story now.";`,
        },
      ],
      registered: [
        {
          id: "known",
          text: "Word practice",
          role: "instruction",
          owner: "student-hub",
          source: "components/student-hub/HomeRoom.tsx",
        },
      ],
      auditedSources: [
        {
          owner: "student-hub",
          source: "components/student-hub/HomeRoom.tsx",
          surface: "home room",
        },
      ],
    });

    expect(result.auditedSourceCount).toBe(1);
    expect(result.unregistered).toEqual([
      expect.objectContaining({
        source: "components/student-hub/HomeRoom.tsx",
        text: "Start story now.",
      }),
    ]);
  });

  it("matches interaction folder audit sources by prefix", () => {
    const result = auditStudentFacingStaticCopySources({
      sources: [
        {
          source: "components/lesson/interactions/FillBlanksView.tsx",
          text: `const msg = "Try again for the empty blanks.";`,
        },
      ],
      registered: [],
      auditedSources: [
        {
          owner: "mini-game",
          source: "components/lesson/interactions",
          surface: "interaction views",
        },
      ],
    });

    expect(result.unregistered).toContainEqual(
      expect.objectContaining({ text: "Try again for the empty blanks." }),
    );
  });

  it("allows documented non-student-facing false positives to be ignored", () => {
    const result = auditStudentFacingStaticCopySources({
      sources: [
        {
          source: "components/lesson/LessonPlayer.tsx",
          text: `const label = "Start button label"; const missing = "Start now.";`,
        },
      ],
      registered: [],
      ignoredLiterals: [
        {
          source: "components/lesson/LessonPlayer.tsx",
          text: "Start button label",
          reason: "Teacher preview label.",
        },
      ],
      auditedSources: [
        {
          owner: "lesson-player",
          source: "components/lesson/LessonPlayer.tsx",
          surface: "lesson player shell",
        },
      ],
    });

    expect(result.unregistered).toEqual([
      expect.objectContaining({ text: "Start now." }),
    ]);
  });
});
