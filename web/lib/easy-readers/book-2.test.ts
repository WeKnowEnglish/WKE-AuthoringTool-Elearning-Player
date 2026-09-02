import { describe, expect, it } from "vitest";

import { bookTwo } from "@/content/easy-readers/book-2";

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

describe("Where Is Milo? easy reader", () => {
  it("uses the approved six-chapter search arc", () => {
    expect(bookTwo.chapters.map((chapter) => chapter.title)).toEqual([
      "An Empty Basket",
      "Searching the House",
      "Clues in the Garden",
      "Around the Neighborhood",
      "A Bark by the Shed",
      "Two Animals Go Home",
    ]);
  });

  it("stays within the planned 600–800 word story range", () => {
    const total = wordCount(
      bookTwo.chapters.flatMap((chapter) => chapter.paragraphs).join(" "),
    );
    expect(total).toBeGreaterThanOrEqual(600);
    expect(total).toBeLessThanOrEqual(800);
  });

  it("provides consistent A1 learning support", () => {
    expect(bookTwo.learningGoals).toHaveLength(3);
    for (const chapter of bookTwo.chapters) {
      expect(chapter.vocabulary).toHaveLength(3);
      expect(chapter.check.choices).toHaveLength(3);
      expect(chapter.check.answerIndex).toBeGreaterThanOrEqual(0);
      expect(chapter.check.answerIndex).toBeLessThan(chapter.check.choices.length);
      expect(chapter.illustration).toContain("/easy-readers/book-2/");
      expect(chapter.talkPrompt).toContain("?");
    }
  });
});
