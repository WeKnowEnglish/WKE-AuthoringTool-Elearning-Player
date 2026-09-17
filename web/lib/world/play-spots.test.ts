import { describe, expect, it } from "vitest";
import { isPlaySpot, playHref } from "./play-spots";

describe("play spots", () => {
  it("opens house, school, and the pet yard", () => {
    expect(isPlaySpot("cottage")).toBe(true);
    expect(isPlaySpot("school")).toBe(true);
    expect(isPlaySpot("pet")).toBe(true);
  });

  it("keeps student and pilot interiors separate", () => {
    expect(playHref("school")).toBe("/primary/world/play/school?inside=1");
    expect(playHref("cottage", "pilot")).toBe("/pilots/world/play/cottage?inside=1");
    expect(playHref("pet")).toBe("/primary?nav=games");
  });
});
