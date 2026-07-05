import { describe, expect, it } from "vitest";
import { mapPosterItem } from "./map-poster-item";

describe("mapPosterItem transformationRow", () => {
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
  });
});
