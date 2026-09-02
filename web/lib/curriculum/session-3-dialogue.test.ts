import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { SESSION_3_DIALOGUE } from "./session-3-dialogue.generated";

describe("Session 3 authored dialogue", () => {
  it("ships 47 clips across four distinct character voices", () => {
    const clips = Object.values(SESSION_3_DIALOGUE);
    expect(clips).toHaveLength(47);
    expect(new Set(clips.map((clip) => clip.speaker))).toEqual(new Set(["Keelan", "Mia", "Leo", "Sam"]));
  });

  it("points every entry to a non-empty public audio file", () => {
    for (const clip of Object.values(SESSION_3_DIALOGUE)) {
      const assetPath = clip.audioUrl.split("?")[0].replace(/^\//, "");
      const filePath = path.join(process.cwd(), "public", assetPath);
      expect(existsSync(filePath), clip.audioUrl).toBe(true);
      expect(statSync(filePath).size, clip.audioUrl).toBeGreaterThan(1000);
    }
  });

  it("keeps Keelan natural and applies the approved child treatment to peers", () => {
    const clips = Object.values(SESSION_3_DIALOGUE);
    expect(clips.filter((clip) => clip.speaker === "Keelan").every((clip) => clip.playbackRate === 1)).toBe(true);
    expect(clips.filter((clip) => clip.speaker !== "Keelan").every((clip) => clip.playbackRate > 1.1)).toBe(true);
  });
});
