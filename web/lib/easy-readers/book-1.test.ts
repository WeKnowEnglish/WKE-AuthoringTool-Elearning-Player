import { describe, expect, it } from "vitest";
import { bookOne } from "@/content/easy-readers/book-1";

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

describe("The New Student easy reader", () => {
  it("keeps the approved six-chapter structure", () => {
    expect(bookOne.chapters.map((chapter) => chapter.title)).toEqual([
      "A New School",
      "Hello, I’m Sam",
      "My New Class",
      "What Do You Like?",
      "Lunchtime",
      "A Good First Day",
    ]);
  });

  it("stays within the planned 500–700 word story range", () => {
    const total = wordCount(
      bookOne.chapters.flatMap((chapter) => chapter.paragraphs).join(" "),
    );
    expect(total).toBeGreaterThanOrEqual(500);
    expect(total).toBeLessThanOrEqual(700);
  });

  it("gives every chapter learning support and a valid check", () => {
    for (const chapter of bookOne.chapters) {
      expect(chapter.vocabulary).toHaveLength(3);
      expect(chapter.check.choices).toHaveLength(3);
      expect(chapter.check.answerIndex).toBeGreaterThanOrEqual(0);
      expect(chapter.check.answerIndex).toBeLessThan(
        chapter.check.choices.length,
      );
      expect(chapter.talkPrompt.length).toBeGreaterThan(10);
    }
  });
});
