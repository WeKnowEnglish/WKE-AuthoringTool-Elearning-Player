import { describe, expect, it } from "vitest";
import { createBakeryVocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/document";
import { compileLessonVocabularyMaterial } from "@/lib/class-lessons/compile-vocabulary";
import { lessonVocabularyInput, normalizeLessonVocabularySources, normalizeLessonVocabularyGeneration, selectLessonVocabularyEntries } from "@/lib/class-lessons/vocabulary";
import { normalizeClassLessonStepInputs, mapDbStepRow } from "@/lib/class-lessons/normalize";
import { parseGamesFlashcardsLessonPlayerPack } from "@/lib/games-flashcards/parse-games-pack";
import { parseGamesMcQuizLessonPlayerPack } from "@/lib/games-mc-quiz/parse-games-pack";
import type { GamesAuthoringDocument } from "@/lib/activity-builder/games/types-mc";

const listId = "10000000-0000-4000-8000-000000000001";
const lessonId = "20000000-0000-4000-8000-000000000001";
const activityId = "30000000-0000-4000-8000-000000000001";

describe("lesson vocabulary materials", () => {
  it("compiles different selected subsets into validated existing player formats", () => {
    const list = createBakeryVocabularyListDocument();
    const flashcards = compileLessonVocabularyMaterial(list, ["v1"], "flashcards");
    const check = compileLessonVocabularyMaterial(list, ["v2", "v3"], "multiple_choice");
    expect(flashcards.itemCount).toBe(1);
    expect(check.itemCount).toBe(2);
    expect(flashcards.authoring.educationalIntent.vocabulary).toEqual(["bread"]);
    expect(check.authoring.educationalIntent.vocabulary).toEqual(["cake", "cookie"]);
    expect(() => parseGamesFlashcardsLessonPlayerPack(flashcards.pack)).not.toThrow();
    expect(() => parseGamesMcQuizLessonPlayerPack(check.pack)).not.toThrow();
  });

  it("uses real meanings as check prompts, bounded distinct distractors, and no answer audio", () => {
    const list = createBakeryVocabularyListDocument();
    list.entries[0]!.audioUrl = "https://example.test/bread.mp3";
    const check = compileLessonVocabularyMaterial(list, ["v1", "v2"], "multiple_choice");
    const items = (check.authoring as GamesAuthoringDocument).interaction.items;
    expect(items[0]?.question).toContain(list.entries[0]!.definitionEn);
    expect(items[0]?.promptAudioUrl).toBeUndefined();
    expect(items.every((item) => item.options.length === 2)).toBe(true);
    expect(items.every((item) => item.options.some((option) => option.id === item.correctOptionId))).toBe(true);
    expect(compileLessonVocabularyMaterial(list, ["v1", "v2"], "multiple_choice").pack).toEqual(check.pack);
  });

  it("rejects incomplete content instead of silently skipping a selected target", () => {
    const list = createBakeryVocabularyListDocument();
    list.entries[0] = { id: "v1", word: "bread" };
    expect(() => compileLessonVocabularyMaterial(list, ["v1", "v2"], "flashcards")).toThrow("bread");
    expect(() => compileLessonVocabularyMaterial(list, ["v1", "v2"], "multiple_choice")).toThrow("definition or picture");
    expect(() => compileLessonVocabularyMaterial(list, ["deleted"], "flashcards")).toThrow("removed");
    expect(() => selectLessonVocabularyEntries(list, ["v2"], "multiple_choice")).toThrow("at least two");
  });

  it("rejects duplicate selections and ambiguous identical definitions", () => {
    const list = createBakeryVocabularyListDocument();
    expect(() => selectLessonVocabularyEntries(list, ["v1", "v1"], "flashcards")).toThrow("duplicate");
    list.entries[1]!.definitionEn = list.entries[0]!.definitionEn;
    expect(() => compileLessonVocabularyMaterial(list, ["v1", "v2"], "multiple_choice")).toThrow("same definition");
  });

  it("fingerprints selected inputs without depending on other list rows", () => {
    const list = createBakeryVocabularyListDocument();
    const original = lessonVocabularyInput(list, ["v1"], "flashcards");
    list.entries[1]!.example = "A changed sentence.";
    expect(lessonVocabularyInput(list, ["v1"], "flashcards")).toBe(original);
    list.entries[0]!.example = "A changed sentence.";
    expect(lessonVocabularyInput(list, ["v1"], "flashcards")).not.toBe(original);
  });

  it("preserves source recipes through step save normalization and database reload", () => {
    const generation = {
      version: 1, adapterVersion: 1, lessonId, sourceName: "Bakery",
      inputHash: "a".repeat(64), generatedAt: "2026-10-06T00:00:00Z",
      recipe: { kind: "vocabulary_list", version: 1, vocabListId: listId, format: "flashcards", selectedEntryIds: ["v1"] },
    };
    const [step] = normalizeClassLessonStepInputs([{ id: activityId, kind: "studio_activity", title: "Cards", phase: "teach", config: {
      activityId, activityTitle: "Cards", format: "flashcards", playPath: `/pilots/games-flashcards?activity=${activityId}`, generation,
    } }]);
    expect(step?.config).toHaveProperty("generation.recipe.selectedEntryIds", ["v1"]);
    const reloaded = mapDbStepRow({ id: activityId, position: 0, kind: "studio_activity", title: "Cards", phase: "teach", duration_minutes: 5, teacher_action: "Model", student_action: "Recall", config: step!.config });
    expect(reloaded?.config).toEqual(step!.config);
    expect(normalizeLessonVocabularySources([{ vocabListId: listId, name: " Bakery " }])).toEqual([{ vocabListId: listId, name: "Bakery" }]);
    expect(() => normalizeLessonVocabularySources([{ vocabListId: "foreign or malformed" }])).toThrow();
    expect(() => normalizeLessonVocabularyGeneration({ ...generation, inputHash: "bad" })).toThrow();
  });
});
