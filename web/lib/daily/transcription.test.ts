import { describe, expect, it } from "vitest";
import { vttToPlainText } from "@/lib/daily/transcription";
import {
  parseRecordingPayload,
  parseTranscriptPayload,
} from "@/lib/daily/webhook-events";

describe("vttToPlainText", () => {
  it("strips cues and keeps spoken lines", () => {
    const vtt = `WEBVTT

1
00:00:00.000 --> 00:00:02.000
Hello class

2
00:00:02.500 --> 00:00:04.000
Please open your books
`;
    expect(vttToPlainText(vtt)).toBe("Hello class\nPlease open your books");
  });
});

describe("parseTranscriptPayload", () => {
  it("reads ready-to-download shape", () => {
    const parsed = parseTranscriptPayload({
      id: "68f65d4c-a4dc-4179-bbb1-c12432afb924",
      room_name: "wke-d-abc",
      duration: 124.4,
      status: "t_finished",
    });
    expect(parsed).toEqual({
      transcriptId: "68f65d4c-a4dc-4179-bbb1-c12432afb924",
      roomName: "wke-d-abc",
      duration: 124.4,
      status: "t_finished",
      error: undefined,
    });
  });
});

describe("parseRecordingPayload", () => {
  it("reads ready-to-download shape", () => {
    const parsed = parseRecordingPayload({
      recording_id: "rec-abc-123",
      room_name: "wke-d-abc",
      duration: 90.5,
      status: "finished",
    });
    expect(parsed).toEqual({
      recordingId: "rec-abc-123",
      roomName: "wke-d-abc",
      duration: 90.5,
      status: "finished",
      error: undefined,
    });
  });

  it("rejects incomplete payloads", () => {
    expect(parseRecordingPayload({ recording_id: "x" })).toBeNull();
    expect(parseRecordingPayload({ room_name: "wke-d-abc" })).toBeNull();
  });
});
