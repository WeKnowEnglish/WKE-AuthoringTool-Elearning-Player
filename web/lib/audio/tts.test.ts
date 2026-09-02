import { describe, expect, it, vi } from "vitest";
import { speakText, speakTextAndWait, stopSpeaking } from "./tts";

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

  it("does not start delayed browser speech after it has been cancelled", async () => {
    vi.useFakeTimers();
    const synth = {
      speaking: true,
      pending: false,
      resume: vi.fn(),
      getVoices: () => [{}],
      cancel: vi.fn(),
      speak: vi.fn(),
    };
    vi.stubGlobal("window", { speechSynthesis: synth, setTimeout });
    vi.stubGlobal("SpeechSynthesisUtterance", class { lang = ""; rate = 1; constructor(public text: string) {} });

    expect(speakText("Old fallback")).toBe(true);
    stopSpeaking();
    await vi.advanceTimersByTimeAsync(100);

    expect(synth.speak).not.toHaveBeenCalled();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
});
