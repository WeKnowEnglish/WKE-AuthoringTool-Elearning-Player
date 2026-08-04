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

  it("shows only deep hubs for non-admins (quiz builder, vocab, LTC, hotspots, library)", () => {
    const sections = visibleActivityBuilderSections(false);
    const ids = sections.flatMap((section) => section.cards.map((card) => card.id));
    expect(ids).toEqual([
      "wke-library",
      "vocabulary-lists",
      "quiz-builder",
      "hotspots",
      "track-builder",
    ]);
    expect(
      sections.every((section) =>
        section.cards.every(
          (card) => isShippableActivityBuilderCard(card) && !card.adminOnly,
        ),
      ),
    ).toBe(true);
  });
});
