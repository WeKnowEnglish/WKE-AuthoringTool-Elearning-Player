import { describe, expect, it } from "vitest";
import { mapPosterItem } from "./map-poster-item";

describe("mapPosterItem", () => {
  it("maps transformation rows on items", () => {
    const example = mapPosterItem({
      transformationRow: {
        from: "cat",
        operator: "+",
        suffix: "s",
        to: "cats",
        graphic: "🐱",
        ipa: "/s/",
      },
    });

    expect(example.transformationRow?.from).toBe("cat");
    expect(example.transformationRow?.ipa).toBe("/s/");
    expect(example.transformationRow?.emoji).toBe("🐱");
    expect(example.emoji).toBe("❓");
    expect(example.align).toBe("center");
  });

  it("prefers graphicAsset emoji over graphic string", () => {
    const example = mapPosterItem({
      text: "There is a book.",
      graphic: "📘",
      graphicAsset: { kind: "emoji", value: "📗" },
      align: "left",
    });

    expect(example.emoji).toBe("📗");
    expect(example.imageUrl).toBeUndefined();
    expect(example.align).toBe("left");
  });

  it("maps graphicAsset url to imageUrl", () => {
    const example = mapPosterItem({
      text: "There is a book.",
      graphic: "📘",
      graphicAsset: { kind: "url", value: "https://cdn.example.com/book.png" },
    });

    expect(example.emoji).toBe("📘");
    expect(example.imageUrl).toBe("https://cdn.example.com/book.png");
  });

  it("drops unsafe graphicAsset urls", () => {
    const example = mapPosterItem({
      text: "There is a book.",
      graphicAsset: { kind: "url", value: "javascript:alert(1)" },
    });

    expect(example.imageUrl).toBeUndefined();
    expect(example.emoji).toBe("❓");
  });
});
