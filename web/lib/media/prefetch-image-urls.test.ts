import { describe, expect, it } from "vitest";
import { uniqueImageUrls } from "./prefetch-image-urls";

describe("uniqueImageUrls", () => {
  it("dedupes and trims", () => {
    expect(
      uniqueImageUrls([" https://a.png ", "https://a.png", "", "https://b.png", null]),
    ).toEqual(["https://a.png", "https://b.png"]);
  });
});
