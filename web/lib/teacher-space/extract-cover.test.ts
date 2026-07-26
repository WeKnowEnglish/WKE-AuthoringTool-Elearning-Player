import { describe, expect, it } from "vitest";
import { extractCoverImageUrlFromPack } from "./extract-cover";

describe("extractCoverImageUrlFromPack", () => {
  it("finds nested https image urls", () => {
    const url = "https://example.com/media/cake.png";
    expect(
      extractCoverImageUrlFromPack({
        screens: [{ payload: { interaction: { image_url: url } } }],
      }),
    ).toBe(url);
  });

  it("ignores data urls and http", () => {
    expect(
      extractCoverImageUrlFromPack({
        image_url: "data:image/png;base64,xxx",
        other: "http://insecure.example/a.png",
      }),
    ).toBeNull();
  });

  it("accepts studio_media paths without extension", () => {
    const url =
      "https://xyz.supabase.co/storage/v1/object/public/studio_media/u/a/photo";
    expect(extractCoverImageUrlFromPack({ pictureUrl: url })).toBe(url);
  });
});
