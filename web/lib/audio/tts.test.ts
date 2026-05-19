import { describe, expect, it, vi } from "vitest";
import { speakTextAndWait } from "./tts";

describe("tts", () => {
  it("speakTextAndWait resolves false when muted", async () => {
    const synth = {
      resume: vi.fn(),
      getVoices: () => [],
      cancel: vi.fn(),
      speak: vi.fn(),
    };
    vi.stubGlobal("speechSynthesis", synth);
    await expect(speakTextAndWait("Hi", { muted: true })).resolves.toBe(false);
    expect(synth.speak).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
