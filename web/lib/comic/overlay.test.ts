import { describe, expect, it } from "vitest";
import { chapterOneEditablePackage } from "@/content/comics/chapter-1";

describe("Chapter 1 editable comic package", () => {
  it("contains one cover and six story pages", () => {
    expect(chapterOneEditablePackage.pages).toHaveLength(7);
    expect(chapterOneEditablePackage.pages[0]?.pageIndex).toBe(1);
    expect(chapterOneEditablePackage.pages[6]?.pageIndex).toBe(7);
  });

  it("keeps every overlay element inside its page canvas", () => {
    for (const page of chapterOneEditablePackage.pages) {
      expect(page.overlay).not.toBeNull();
      for (const element of page.overlay?.elements ?? []) {
        expect(element.bounds.x + element.bounds.width).toBeLessThanOrEqual(100);
        expect(element.bounds.y + element.bounds.height).toBeLessThanOrEqual(100);
      }
    }
  });

  it("uses unique reading-order numbers on every page", () => {
    for (const page of chapterOneEditablePackage.pages) {
      const orders = (page.overlay?.elements ?? [])
        .map((element) => element.readOrder)
        .filter((order): order is number => order != null);
      expect(new Set(orders).size).toBe(orders.length);
    }
  });

  it("contains the approved Chapter 1 dialogue corrections", () => {
    const allText = chapterOneEditablePackage.pages
      .flatMap((page) => page.overlay?.elements ?? [])
      .map((element) => element.text);

    expect(allText).toContain("Space is amazing. It’s real science.");
    expect(allText).toContain("I don’t think aliens are real.");
    expect(allText).toContain("Did you see that?!");
    expect(allText).toContain("We have to see it!");
    expect(allText).toContain("I don’t see anyone…");
  });

  it("adds five editable panel numbers to page 5", () => {
    const pageFive = chapterOneEditablePackage.pages[5];
    const numbers = (pageFive?.overlay?.elements ?? [])
      .filter((element) => element.kind === "panel_number")
      .map((element) => element.text);

    expect(numbers).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("introduces the four students by their canonical colors", () => {
    expect(chapterOneEditablePackage.pages[0]?.overlay?.cast).toEqual([
      expect.objectContaining({ speakerId: "mia", name: "Mia", color: "#8b5cf6" }),
      expect.objectContaining({ speakerId: "zara", name: "Zara", color: "#eab308" }),
      expect.objectContaining({ speakerId: "ethan", name: "Ethan", color: "#22c55e" }),
      expect.objectContaining({ speakerId: "leo", name: "Leo", color: "#3b82f6" }),
    ]);
  });

  it("keeps the corrected page 1 panel 3 character and bubble positions", () => {
    const pageOne = chapterOneEditablePackage.pages[1];
    const mia = pageOne?.overlay?.elements.find((element) => element.id === "p3-mia");
    const zara = pageOne?.overlay?.elements.find((element) => element.id === "p3-zara");

    expect(pageOne?.publicUrl).toBe("/comics/chapter-1/art/page-01-art-v2.png");
    expect(mia?.bounds.x).toBeLessThan(zara?.bounds.x ?? 0);
    expect(mia?.speakerId).toBe("mia");
    expect(zara?.speakerId).toBe("zara");
  });

  it("uses the page 4 master without duplicate entrance backpacks", () => {
    const pageFour = chapterOneEditablePackage.pages[4];

    expect(pageFour?.publicUrl).toBe("/comics/chapter-1/art/page-04-art-v2.png");
    expect(pageFour?.overlay?.altText).toContain("with their backpacks");
    expect(pageFour?.overlay?.altText).not.toContain("leave their backpacks");
  });
});
