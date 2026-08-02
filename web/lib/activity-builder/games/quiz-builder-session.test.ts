import { describe, expect, it } from "vitest";
import { createBakeryVocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/document";
import { compileQuizzesFromVocabList } from "@/lib/activity-builder/games/compile-from-vocab-list";
import {
  QUIZ_FORMATS,
  createBlankSession,
  exportQuizSession,
  sessionFromCompileRow,
  sessionItemCount,
  validateQuizSession,
} from "@/lib/activity-builder/games/quiz-builder-session";
import { CORE_MODULE_IDS } from "@/lib/activity-builder/core-modules/types";

describe("quiz-builder-session", () => {
  it("lists all eight core formats", () => {
    expect(QUIZ_FORMATS.map((row) => row.format)).toEqual([...CORE_MODULE_IDS]);
  });

  it("creates blank sessions for every format", () => {
    for (const { format } of QUIZ_FORMATS) {
      const session = createBlankSession(format);
      expect(session.format).toBe(format);
      expect(sessionItemCount(session)).toBeGreaterThan(0);
    }
  });

  it("compiles bakery list into editable sessions and exports packs", () => {
    const list = createBakeryVocabularyListDocument();
    const compiled = compileQuizzesFromVocabList({
      list,
      formats: [...CORE_MODULE_IDS],
    });
    expect(compiled.results).toHaveLength(8);

    for (const row of compiled.results) {
      const session = sessionFromCompileRow(row);
      expect(session.format).toBe(row.format);
      validateQuizSession(session);
      const exported = exportQuizSession(session);
      expect(exported.format).toBe(row.format);
      expect(exported.pack).toMatchObject({
        kind: "lessonplayer-games-pack",
        format: row.format,
      });
    }
  });
});
