import { describe, expect, it } from "vitest";
import {
  ACTIVITY_BUILDER_SECTIONS,
  isShippableActivityBuilderCard,
  visibleActivityBuilderSections,
} from "./catalog";

describe("visibleActivityBuilderSections", () => {
  it("shows all catalog cards for admins", () => {
    const sections = visibleActivityBuilderSections(true);
    expect(sections).toEqual(ACTIVITY_BUILDER_SECTIONS);
  });

  it("hides studio-interim cards for non-admins", () => {
    const sections = visibleActivityBuilderSections(false);
    const ids = sections.flatMap((section) => section.cards.map((card) => card.id));
    expect(ids).toEqual([
      "vocabulary-lists",
      "multiple-choice",
      "flashcards",
      "letter-mixup",
      "hotspots",
      "learning-tracks",
    ]);
    expect(
      sections.every((section) =>
        section.cards.every(isShippableActivityBuilderCard),
      ),
    ).toBe(true);
  });
});
