import { describe, expect, it } from "vitest";
import {
  patchItemEmojiGraphic,
  patchItemUrlGraphic,
  resolveItemAlign,
  resolveItemEmoji,
  resolveItemImageUrl,
} from "./grammar-item-graphic";

describe("grammar-item-graphic", () => {
  it("patches emoji graphic and asset together", () => {
    expect(patchItemEmojiGraphic("📘")).toEqual({
      graphic: "📘",
      graphicAsset: { kind: "emoji", value: "📘" },
    });
    expect(patchItemEmojiGraphic("  ")).toEqual({
      graphic: undefined,
      graphicAsset: undefined,
    });
  });

  it("patches url graphic assets", () => {
    expect(patchItemUrlGraphic("https://cdn.example.com/a.png")).toEqual({
      graphicAsset: { kind: "url", value: "https://cdn.example.com/a.png" },
    });
  });

  it("resolves display fields from item", () => {
    expect(
      resolveItemEmoji({
        text: "Hi",
        graphic: "📘",
        graphicAsset: { kind: "emoji", value: "📗" },
      }),
    ).toBe("📗");
    expect(
      resolveItemImageUrl({
        text: "Hi",
        graphicAsset: { kind: "url", value: "/icon.png" },
      }),
    ).toBe("/icon.png");
    expect(resolveItemAlign({ text: "Hi" })).toBe("center");
  });
});
