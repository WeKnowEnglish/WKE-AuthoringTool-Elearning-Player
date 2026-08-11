import { describe, expect, it } from "vitest";
import { recordedAudioFile } from "@/lib/media/recorded-audio";

describe("recordedAudioFile", () => {
  it("preserves an Apple MP4 recording as an M4A file", () => {
    const file = recordedAudioFile([new Blob(["audio"], { type: "audio/mp4" })], "audio/mp4;codecs=mp4a.40.2", "phone-recording");
    expect(file.name).toBe("phone-recording.m4a");
    expect(file.type).toBe("audio/mp4");
  });

  it("preserves a WebM recording and extension", () => {
    const file = recordedAudioFile([new Blob(["audio"], { type: "audio/webm" })], "audio/webm;codecs=opus", "browser-recording");
    expect(file.name).toBe("browser-recording.webm");
    expect(file.type).toBe("audio/webm");
  });
});
