import { describe, expect, it } from "vitest";
import { teacherControlLabel } from "@/lib/activity-runtime/activity-commands";
import { studentFacingState } from "@/lib/activity-runtime/activity-phases";
import {
  deckReadyForPlay,
  DEFAULT_WORD_CARDS_SETTINGS,
  isInClassDeck,
  isInClassPile,
  type WordCardsModeration,
} from "@/lib/word-cards/domain";

describe("word cards moderation (WC-3)", () => {
  it("exposes Approve / Edit labels", () => {
    expect(teacherControlLabel("APPROVE_CARD")).toBe("Approve");
    expect(teacherControlLabel("EDIT_CARD")).toBe("Save edit");
  });

  it("treats pending as pile and approved as deck only", () => {
    const mods: WordCardsModeration[] = ["none", "pending", "approved", "returned"];
    expect(mods.filter(isInClassPile)).toEqual(["pending"]);
    expect(mods.filter(isInClassDeck)).toEqual(["approved"]);
    expect(isInClassDeck("pending")).toBe(false);
    expect(isInClassPile("approved")).toBe(false);
    expect(isInClassDeck("returned")).toBe(false);
  });

  it("requires min approved cards before play is ready", () => {
    const min = DEFAULT_WORD_CARDS_SETTINGS.minDeckSizeForPlay;
    expect(min).toBe(4);
    expect(deckReadyForPlay(3, min)).toBe(false);
    expect(deckReadyForPlay(4, min)).toBe(true);
  });

  it("maps moderating phase to Class review for students", () => {
    expect(
      studentFacingState({
        phase: "moderating",
        workStatus: "locked",
        hasReviewPush: false,
      }),
    ).toBe("Class review");
  });
});
