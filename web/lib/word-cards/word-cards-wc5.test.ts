import { describe, expect, it } from "vitest";
import { teacherControlLabel } from "@/lib/activity-runtime/activity-commands";
import { studentFacingState } from "@/lib/activity-runtime/activity-phases";
import {
  aggregatePlayResults,
  buildDefinitionRaceChoiceWords,
  buildPlayItem,
  canStartDefinitionRace,
  isAnswerCorrect,
  listApprovedPlayableCards,
  pickNextPromptCard,
  playChoiceDisplayOrder,
  seededShuffle,
  type ApprovedDeckCard,
  type WordCardsPlayState,
} from "@/lib/word-cards/play";

const deck: ApprovedDeckCard[] = [
  { id: "c1", assignedWord: "apple", definition: "A red fruit.", moderation: "approved" },
  { id: "c2", assignedWord: "banana", definition: "A yellow fruit.", moderation: "approved" },
  { id: "c3", assignedWord: "cherry", definition: "A small red fruit.", moderation: "approved" },
  { id: "c4", assignedWord: "date", definition: "A sweet fruit.", moderation: "approved" },
  { id: "c5", assignedWord: "elder", definition: "", moderation: "approved" },
  { id: "c6", assignedWord: "fig", definition: "Soft fruit.", moderation: "pending" },
];

describe("word cards definition race (WC-5)", () => {
  it("exposes play control labels", () => {
    expect(teacherControlLabel("START_PLAY")).toBe("Start race");
    expect(teacherControlLabel("LOCK_PLAY_ANSWERS")).toBe("Lock answers");
    expect(teacherControlLabel("REVEAL_PLAY_RESULTS")).toBe("Reveal");
    expect(teacherControlLabel("NEXT_PLAY_ITEM")).toBe("Next");
    expect(teacherControlLabel("END_PLAY")).toBe("End play");
  });

  it("requires 4 playable approved cards (definition present)", () => {
    const playable = listApprovedPlayableCards(deck);
    expect(playable).toHaveLength(4);
    expect(canStartDefinitionRace(3)).toBe(false);
    expect(canStartDefinitionRace(4)).toBe(true);
  });

  it("always includes the correct word in the choice set", () => {
    const playable = listApprovedPlayableCards(deck);
    const choices = buildDefinitionRaceChoiceWords(playable, "banana");
    expect(choices.map((w) => w.toLowerCase())).toContain("banana");
    expect(choices.length).toBeGreaterThanOrEqual(4);
  });

  it("privately shuffles deterministically per student/item", () => {
    const words = ["a", "b", "c", "d"];
    const a1 = playChoiceDisplayOrder({
      choiceWords: words,
      userId: "stu_a",
      promptCardId: "c1",
      itemIndex: 0,
    });
    const a2 = playChoiceDisplayOrder({
      choiceWords: words,
      userId: "stu_a",
      promptCardId: "c1",
      itemIndex: 0,
    });
    const b1 = playChoiceDisplayOrder({
      choiceWords: words,
      userId: "stu_b",
      promptCardId: "c1",
      itemIndex: 0,
    });
    expect(a1).toEqual(a2);
    expect(a1.sort()).toEqual([...words].sort());
    // Different students usually get different order (not guaranteed for all seeds, but likely).
    expect(seededShuffle(words, "x").length).toBe(4);
    expect(new Set(b1).size).toBe(4);
  });

  it("builds a selecting play item and aggregates reveal counts", () => {
    const playable = listApprovedPlayableCards(deck);
    const card = pickNextPromptCard(playable, [])!;
    const play = buildPlayItem({
      card,
      approvedPlayable: playable,
      itemIndex: 0,
      usedCardIds: [],
      now: 1,
    });
    expect(play.status).toBe("selecting");
    expect(play.choiceWords).toContain(play.correctWord);
    expect(play.usedCardIds).toContain(card.id);

    const withAnswers: WordCardsPlayState = {
      ...play,
      status: "revealed",
      answersByStudentId: {
        s1: { selectedWord: play.correctWord, updatedAt: 2 },
        s2: { selectedWord: "wrong", updatedAt: 3 },
        s3: { selectedWord: null, updatedAt: 4 },
      },
    };
    const agg = aggregatePlayResults(withAnswers);
    expect(agg.correct).toBe(1);
    expect(agg.incorrect).toBe(1);
    expect(agg.blank).toBe(1);
    expect(isAnswerCorrect(play.correctWord, play.correctWord)).toBe(true);
  });

  it("maps play phase to Active / Submitted for students", () => {
    expect(
      studentFacingState({
        phase: "play",
        workStatus: "active",
        hasReviewPush: false,
      }),
    ).toBe("Active");
    expect(
      studentFacingState({
        phase: "play",
        workStatus: "locked",
        hasReviewPush: false,
      }),
    ).toBe("Submitted");
  });

  it("cycles prompt cards after the deck is exhausted", () => {
    const playable = listApprovedPlayableCards(deck);
    const used = playable.map((c) => c.id);
    const next = pickNextPromptCard(playable, used);
    expect(next).not.toBeNull();
    expect(playable.map((c) => c.id)).toContain(next!.id);
  });
});
