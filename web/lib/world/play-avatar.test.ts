import { describe, expect, it } from "vitest";
import { DEFAULT_CHARACTER_CONFIG } from "@/lib/character/character-defaults";
import {
  faceEditorHref,
  outfitEditorHref,
  PLAY_AVATAR_SCALE,
  safeAppReturnHref,
} from "./play-avatar";

describe("play avatar", () => {
  it("keeps the play figure near kid height", () => {
    expect(PLAY_AVATAR_SCALE).toBeGreaterThan(0.22);
    expect(PLAY_AVATAR_SCALE).toBeLessThan(0.32);
  });

  it("routes wardrobe edits back to the house", () => {
    const home = "/pilots/world/play/cottage?inside=1";
    expect(outfitEditorHref(home, "pilot")).toContain("character-editor");
    expect(outfitEditorHref(home, "pilot")).toContain(encodeURIComponent(home));
    expect(faceEditorHref(home)).toContain("/primary/world/face");
  });

  it("rejects external return URLs", () => {
    expect(safeAppReturnHref("https://evil.test", "/primary/world")).toBe("/primary/world");
    expect(safeAppReturnHref("//evil.test", "/primary/world")).toBe("/primary/world");
    expect(safeAppReturnHref("/primary/world/play/cottage?inside=1", "/x")).toBe(
      "/primary/world/play/cottage?inside=1",
    );
  });

  it("keeps a default outfit shape", () => {
    expect(DEFAULT_CHARACTER_CONFIG.top).toBeTruthy();
  });
});
