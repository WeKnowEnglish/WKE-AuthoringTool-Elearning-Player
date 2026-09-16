import { describe, expect, it } from "vitest";
import { isPlaySpot, playHref } from "./play-spots";

describe("play spots", () => {
  it("opens house and school, not the pet yard", () => {
    expect(isPlaySpot("cottage")).toBe(true);
    expect(isPlaySpot("school")).toBe(true);
    expect(isPlaySpot("pet")).toBe(false);
  });

  it("keeps student and pilot play routes separate", () => {
    expect(playHref("school")).toBe("/primary/world/play/school");
    expect(playHref("cottage", "pilot")).toBe("/pilots/world/play/cottage");
  });
});
