import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { SESSION_2_DIALOGUE } from "./session-2-dialogue.generated";

describe("Session 2 authored dialogue", () => {
  it("ships 50 clips across four distinct character voices", () => {
    const clips = Object.values(SESSION_2_DIALOGUE);
    expect(clips).toHaveLength(50);
    expect(new Set(clips.map((clip) => clip.speaker))).toEqual(new Set(["Keelan", "Mia", "Leo", "Sam"]));
  });

  it("applies a childlike pitch treatment only to the three learner characters", () => {
    const clips = Object.values(SESSION_2_DIALOGUE);
    expect(clips.filter((clip) => clip.speaker === "Keelan").every((clip) => clip.playbackRate === 1)).toBe(true);
    expect(clips.filter((clip) => clip.speaker !== "Keelan").every((clip) => clip.playbackRate > 1.1)).toBe(true);
  });

  it("points every dialogue entry to a non-empty public audio file", () => {
    for (const clip of Object.values(SESSION_2_DIALOGUE)) {
      const assetPath = clip.audioUrl.split("?")[0].replace(/^\//, "");
      const filePath = path.join(process.cwd(), "public", assetPath);
      expect(existsSync(filePath), clip.audioUrl).toBe(true);
      expect(statSync(filePath).size, clip.audioUrl).toBeGreaterThan(1000);
    }
  });
});
