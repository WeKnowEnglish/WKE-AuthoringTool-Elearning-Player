import { describe, expect, it } from "vitest";
import {
  compositionFromQuizBuilderCards,
  createPracticeTrackFromQuizCards,
  practiceTrackTitleFromCards,
  type QuizBuilderTrackCard,
} from "@/lib/activity-builder/games/quiz-builder-practice-track";

function card(
  format: QuizBuilderTrackCard["format"],
  listId: string,
): QuizBuilderTrackCard {
  return {
    format,
    source: "vocab_list",
    listId,
    listName: "Hobbies",
    selectedEntryIds: ["e1", "e2"],
    masterPrompt: "What is this?",
    mcOptionCount: 4,
    mcShuffleOptions: true,
    letterShuffleLetters: true,
    letterCaseSensitive: false,
    flashcardsShuffleCards: true,
    flashcardsFrontFaces: ["picture"],
    flashcardsBackFaces: ["word", "example"],
    wordSearchAllowBackwards: false,
    wordSearchAllowDiagonals: false,
    wordSearchAllowBackwardsDiagonals: false,
    memoryTextMode: "word",
    crosswordClueMode: "definition_or_example",
  };
}

describe("quiz-builder-practice-track", () => {
  it("titles a mixed practice track from formats", () => {
    expect(
      practiceTrackTitleFromCards([
        card("multiple_choice", "list-a"),
        card("listen_and_choose", "list-a"),
      ]),
    ).toBe("Practice · Multiple choice + Listen and choose");
  });

  it("builds a practice composition with one vocab_compile beat per card", () => {
    const composition = compositionFromQuizBuilderCards({
      trackId: "track-1",
      title: "Practice · Mixed",
      cards: [
        card("multiple_choice", "list-a"),
        card("listen_and_choose", "list-b"),
        card("letter_mixup", "list-a"),
      ],
    });
    expect(composition.beats).toHaveLength(3);
    expect(composition.beats.map((beat) => beat.kind)).toEqual([
      "multiple_choice",
      "listen_and_choose",
      "letter_mixup",
    ]);
    expect(composition.beats[0]?.source).toMatchObject({
      type: "vocab_compile",
      listId: "list-a",
      format: "multiple_choice",
      selectedEntryIds: ["e1", "e2"],
    });
    expect(composition.beats[1]?.source).toMatchObject({
      type: "vocab_compile",
      listId: "list-b",
      format: "listen_and_choose",
    });
  });

  it("creates a practice activity-track draft", () => {
    const track = createPracticeTrackFromQuizCards([
      card("flashcards", "list-a"),
      card("true_false", "list-a"),
    ]);
    expect(track.mode).toBe("practice");
    expect(track.practiceComposition?.beats).toHaveLength(2);
    expect(track.title).toContain("Practice");
  });

  it("carries word-game settings into practice beats", () => {
    const memory = {
      ...card("memory", "list-a"),
      memoryTextMode: "example" as const,
    };
    const crossword = {
      ...card("crossword", "list-a"),
      crosswordClueMode: "definition" as const,
    };
    const wordSearch = {
      ...card("wordsearch", "list-a"),
      wordSearchAllowDiagonals: true,
      wordSearchAllowBackwardsDiagonals: true,
    };
    const composition = compositionFromQuizBuilderCards({
      trackId: "track-games",
      title: "Word games",
      cards: [memory, crossword, wordSearch],
    });
    expect(composition.beats[0]?.presentation?.memory?.textMode).toBe("example");
    expect(composition.beats[1]?.presentation?.crossword?.clueMode).toBe(
      "definition",
    );
    expect(composition.beats[2]?.presentation?.wordSearch).toMatchObject({
      allowBackwards: false,
      allowDiagonals: true,
      allowBackwardsDiagonals: true,
    });
  });

  it("rejects blank cards for mixed tracks", () => {
    expect(() =>
      createPracticeTrackFromQuizCards([
        { ...card("multiple_choice", "list-a"), source: "blank", listId: null },
        card("listen_and_choose", "list-a"),
      ]),
    ).toThrow(/vocabulary list/i);
  });
});
