import { describe, expect, it } from "vitest";
import { chapterTwoEditablePackage } from "@/content/comics/chapter-2";

describe("Chapter 2 editable comic package", () => {
  it("contains six unique story pages in order", () => {
    expect(chapterTwoEditablePackage.pages).toHaveLength(6);
    expect(chapterTwoEditablePackage.pages.map((page) => page.pageIndex)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
    expect(new Set(chapterTwoEditablePackage.pages.map((page) => page.publicUrl)).size).toBe(6);
  });

  it("keeps every overlay element inside its page", () => {
    for (const page of chapterTwoEditablePackage.pages) {
      expect(page.overlay).not.toBeNull();
      for (const element of page.overlay?.elements ?? []) {
        expect(element.bounds.x + element.bounds.width).toBeLessThanOrEqual(100);
        expect(element.bounds.y + element.bounds.height).toBeLessThanOrEqual(100);
      }
    }
  });

  it("uses unique reading-order values on every page", () => {
    for (const page of chapterTwoEditablePackage.pages) {
      const orders = (page.overlay?.elements ?? [])
        .map((element) => element.readOrder)
        .filter((order): order is number => order != null);
      expect(new Set(orders).size).toBe(orders.length);
    }
  });

  it("uses the corrected A1-A2 dialogue", () => {
    const allText = chapterTwoEditablePackage.pages
      .flatMap((page) => page.overlay?.elements ?? [])
      .map((element) => element.text);

    expect(allText).toContain("He can talk!");
    expect(allText).toContain("This is a strange way to hide.");
    expect(allText).toContain("I'll be all right.");
    expect(allText).toContain("I am.");
    expect(allText).toContain("Anyone like me.");
    expect(allText).toContain("He went to find others like him.");
    expect(allText).not.toContain("It talks!");
    expect(allText).not.toContain("I'm trying.");
    expect(allText).not.toContain("Any of my species.");
  });

  it("gives the supplies to their canonical owners", () => {
    const pageTwo = chapterTwoEditablePackage.pages[1];
    const elements = pageTwo?.overlay?.elements ?? [];

    expect(elements).toContainEqual(
      expect.objectContaining({ speakerId: "mia", text: "I'll bring food." }),
    );
    expect(elements).toContainEqual(
      expect.objectContaining({ speakerId: "zara", text: "I'll bring water." }),
    );
    expect(elements).toContainEqual(
      expect.objectContaining({ speakerId: "leo", text: "I'll get a blanket." }),
    );
    expect(elements).toContainEqual(
      expect.objectContaining({
        speakerId: "ethan",
        text: "We have to help him. I'll help carry him.",
      }),
    );
  });

  it("makes Grandpa Minh an explicit trusted speaker", () => {
    const grandpaLines = chapterTwoEditablePackage.pages
      .flatMap((page) => page.overlay?.elements ?? [])
      .filter((element) => element.speakerId === "grandpa_minh");

    expect(grandpaLines.length).toBeGreaterThanOrEqual(3);
    expect(grandpaLines.map((line) => line.text)).toContain(
      "Take him to Leo's treehouse. I'll tell your families.",
    );
  });

  it("provides a learning prompt and vocabulary on every page", () => {
    for (const page of chapterTwoEditablePackage.pages) {
      expect(page.overlay?.discussionPrompt?.length).toBeGreaterThan(10);
      expect(page.overlay?.vocabulary.length).toBeGreaterThanOrEqual(3);
    }
  });
});
