import { describe, expect, it } from "vitest";
import {
  GRADED_REUSABLE_PART_KINDS,
  isLpGradedPackKind,
  LP_GRADED_PACK_KINDS,
  READING_MODULE_KINDS,
} from "@/lib/activity-formats/registry";
import { seedGradedPartFromKind } from "@/lib/activity-tracks/seed-graded";
import { scoreHomeworkCollectionPart } from "@/lib/homework-collections/scoring";
import { seedDocumentModuleFromTrackKind, documentModuleItemIds } from "@/lib/homework-collections/document-module";

describe("activity-formats registry", () => {
  it("lists LP pack kinds in graded reusable parts", () => {
    for (const kind of LP_GRADED_PACK_KINDS) {
      expect(GRADED_REUSABLE_PART_KINDS).toContain(kind);
      expect(isLpGradedPackKind(kind)).toBe(true);
    }
  });

  it("includes writing_prompt for graded collections", () => {
    expect(GRADED_REUSABLE_PART_KINDS).toContain("writing_prompt");
  });

  it("lists reading modules in graded reusable parts", () => {
    for (const kind of READING_MODULE_KINDS) {
      expect(GRADED_REUSABLE_PART_KINDS).toContain(kind);
    }
  });
});

describe("seedGradedPartFromKind LP packs", () => {
  it("seeds flashcards as a lesson_player_pack homework part", () => {
    const part = seedGradedPartFromKind({
      kind: "flashcards",
      order: 1,
      level: "primary",
    });
    expect(part?.kind).toBe("flashcards");
    expect(part?.source.type).toBe("homework_part");
    if (part?.source.type !== "homework_part") throw new Error("expected homework part");
    expect(part.source.part.kind).toBe("lesson_player_pack");
    expect(part.source.part.studioFormat).toBe("flashcards");
  });

  it("seeds wordsearch for secondary graded tracks", () => {
    const part = seedGradedPartFromKind({
      kind: "wordsearch",
      order: 2,
      level: "secondary",
    });
    expect(part?.source.type).toBe("homework_part");
    if (part?.source.type !== "homework_part") throw new Error("expected homework part");
    expect(part.source.part.kind).toBe("lesson_player_pack");
    expect(part.source.part.studioFormat).toBe("wordsearch");
  });

  it("seeds read_and_answer as a document_module homework part", () => {
    const part = seedGradedPartFromKind({
      kind: "read_and_answer",
      order: 1,
      level: "primary",
    });
    expect(part?.source.type).toBe("homework_part");
    if (part?.source.type !== "homework_part") throw new Error("expected homework part");
    expect(part.source.part.kind).toBe("document_module");
    expect(part.source.part.moduleFormat).toBe("read_and_answer");
  });

  it("scores document module answers from frozen content", () => {
    const part = seedDocumentModuleFromTrackKind("cloze_choice");
    const scored = scoreHomeworkCollectionPart(part, { answers: {} });
    expect(documentModuleItemIds(part).length).toBeGreaterThan(0);
    expect(scored.itemCount).toBe(documentModuleItemIds(part).length);
    expect(scored.correct).toBe(0);
  });
});
