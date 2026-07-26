import { describe, expect, it } from "vitest";
import { createBakeryVocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/document";
import { compileQuizzesFromVocabList } from "@/lib/activity-builder/games/compile-from-vocab-list";
import { exportGamesMcQuizForLessonPlayer } from "@/lib/activity-builder/games/mc-quiz";
import type { GamesAuthoringDocument } from "@/lib/activity-builder/games/types-mc";
import {
  applyMcItemOverlays,
  listMcQuizItemsFromScreens,
  pruneMcItemOverlays,
  upsertMcItemOverlay,
} from "@/lib/learning-tracks/mc-item-overlays";
import { compileQuizScreensFromBuiltinList } from "@/lib/learning-tracks/resolve-beat-screens";
import type { LearningTrackBeatInstance } from "@/lib/learning-tracks/composition-types";

describe("MCQ item overlays (Phase C)", () => {
  it("uses stable item ids when mcStableItems is true", () => {
    const list = createBakeryVocabularyListDocument();
    const output = compileQuizzesFromVocabList({
      list,
      formats: ["multiple_choice"],
      mcStableItems: true,
      mcShuffleOptions: false,
    });
    const doc = output.results[0]?.document as GamesAuthoringDocument;
    expect(doc.interaction.items.map((item) => item.id)).toEqual([
      "mc-v1",
      "mc-v2",
      "mc-v3",
      "mc-v4",
    ]);
    const again = compileQuizzesFromVocabList({
      list,
      formats: ["multiple_choice"],
      mcStableItems: true,
      mcShuffleOptions: false,
    });
    const doc2 = again.results[0]?.document as GamesAuthoringDocument;
    expect(doc2.interaction.items[0]?.options.map((option) => option.label)).toEqual(
      doc.interaction.items[0]?.options.map((option) => option.label),
    );
  });

  it("applies question, option label, and prompt audio overlays", () => {
    const list = createBakeryVocabularyListDocument();
    const output = compileQuizzesFromVocabList({
      list,
      formats: ["multiple_choice"],
      mcStableItems: true,
    });
    const doc = output.results[0]?.document as GamesAuthoringDocument;
    const merged = applyMcItemOverlays(doc, [
      {
        itemId: "mc-v1",
        question: "Find the bakery.",
        optionLabels: { a: "the bakery" },
        promptAudioUrl: "https://cdn.example/bakery.webm",
      },
      { itemId: "mc-missing", question: "Ignored" },
    ]);
    const item = merged.interaction.items.find((row) => row.id === "mc-v1");
    expect(item?.question).toBe("Find the bakery.");
    expect(item?.options.find((option) => option.id === "a")?.label).toBe("the bakery");
    expect(item?.promptAudioUrl).toBe("https://cdn.example/bakery.webm");
  });

  it("applies correctOptionId overlay when it matches an option", () => {
    const list = createBakeryVocabularyListDocument();
    const output = compileQuizzesFromVocabList({
      list,
      formats: ["multiple_choice"],
      mcStableItems: true,
      mcShuffleOptions: false,
    });
    const doc = output.results[0]?.document as GamesAuthoringDocument;
    const original = doc.interaction.items.find((row) => row.id === "mc-v1");
    expect(original?.correctOptionId).toBe("a");

    const merged = applyMcItemOverlays(doc, [
      { itemId: "mc-v1", correctOptionId: "b" },
    ]);
    expect(merged.interaction.items.find((row) => row.id === "mc-v1")?.correctOptionId).toBe(
      "b",
    );

    const ignored = applyMcItemOverlays(doc, [
      { itemId: "mc-v1", correctOptionId: "not-an-option" },
    ]);
    expect(ignored.interaction.items.find((row) => row.id === "mc-v1")?.correctOptionId).toBe(
      "a",
    );
  });

  it("exports item_id and lists editable items from screens", () => {
    const list = createBakeryVocabularyListDocument();
    const output = compileQuizzesFromVocabList({
      list,
      formats: ["multiple_choice"],
      mcStableItems: true,
    });
    const doc = applyMcItemOverlays(output.results[0]!.document as GamesAuthoringDocument, [
      { itemId: "mc-v2", question: "Point to bread." },
    ]);
    const pack = exportGamesMcQuizForLessonPlayer(doc);
    expect(pack.screens[0]?.item_id).toBe("mc-v1");
    const items = listMcQuizItemsFromScreens(pack.screens);
    expect(items[1]?.question).toBe("Point to bread.");
    expect(items[1]?.itemId).toBe("mc-v2");
  });

  it("upserts and prunes overlays", () => {
    let overlays = upsertMcItemOverlay(undefined, "mc-v1", {
      question: "One",
      promptAudioUrl: "https://cdn.example/a.webm",
    });
    overlays = upsertMcItemOverlay(overlays, "mc-v1", {
      optionLabel: { optionId: "b", label: "alt" },
    });
    expect(overlays).toEqual([
      {
        itemId: "mc-v1",
        question: "One",
        promptAudioUrl: "https://cdn.example/a.webm",
        optionLabels: { b: "alt" },
      },
    ]);
    overlays = upsertMcItemOverlay(overlays, "mc-v1", {
      question: null,
      promptAudioUrl: null,
      optionLabel: { optionId: "b", label: null },
    });
    expect(overlays).toBeUndefined();

    expect(
      pruneMcItemOverlays(
        [
          { itemId: "mc-v1", question: "Keep" },
          { itemId: "mc-gone", question: "Drop" },
        ],
        ["mc-v1"],
      ),
    ).toEqual([{ itemId: "mc-v1", question: "Keep" }]);
  });

  it("keeps spaces while typing overlays (trim only at apply)", () => {
    const overlays = upsertMcItemOverlay(undefined, "mc-v1", {
      question: "Find the ",
      optionLabel: { optionId: "a", label: "the " },
    });
    expect(overlays?.[0]?.question).toBe("Find the ");
    expect(overlays?.[0]?.optionLabels?.a).toBe("the ");

    const list = createBakeryVocabularyListDocument();
    const output = compileQuizzesFromVocabList({
      list,
      formats: ["multiple_choice"],
      mcStableItems: true,
    });
    const merged = applyMcItemOverlays(output.results[0]!.document as GamesAuthoringDocument, overlays);
    expect(merged.interaction.items[0]?.question).toBe("Find the");
    expect(merged.interaction.items[0]?.options.find((o) => o.id === "a")?.label).toBe("the");
  });

  it("wires overlays through LTC vocab compile", () => {
    const beat: LearningTrackBeatInstance = {
      id: "beat-mc",
      kind: "multiple_choice",
      source: {
        type: "vocab_compile",
        listId: "hobbies-default",
        format: "multiple_choice",
      },
      presentation: {
        multipleChoice: {
          masterQuestion: "What hobby is this?",
          optionCount: 3,
          shuffleOptions: false,
          autoAdvanceOnPass: true,
          itemOverlays: [
            {
              itemId: "mc-v1",
              question: "Which hobby uses paint?",
              promptAudioUrl: "https://cdn.example/painting.webm",
            },
          ],
        },
      },
    };
    const screens = compileQuizScreensFromBuiltinList("multiple_choice", beat);
    expect(screens[0]?.item_id).toBe("mc-v1");
    expect(screens[0]?.question).toBe("Which hobby uses paint?");
    expect(screens[0]?.prompt_audio_url).toBe("https://cdn.example/painting.webm");
    expect(screens[1]?.question).toBe("What hobby is this?");
  });
});
