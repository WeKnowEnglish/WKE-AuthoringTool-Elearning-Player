import { afterEach, describe, expect, it, vi } from "vitest";
import { transcribeSession1Speaking } from "./session-1-transcription";

const originalKey = process.env.OPENAI_API_KEY;
const originalModel = process.env.OPENAI_TRANSCRIPTION_MODEL;

afterEach(() => {
  process.env.OPENAI_API_KEY = originalKey;
  process.env.OPENAI_TRANSCRIPTION_MODEL = originalModel;
});

describe("Session 1 transcription service", () => {
  it("sends a short English transcription request and analyzes the result", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = init?.body as FormData;
      expect(body.get("model")).toBe("gpt-4o-mini-transcribe");
      expect(body.get("language")).toBe("en");
      expect(body.get("response_format")).toBe("json");
      expect(body.getAll("include[]")).toEqual(["logprobs"]);
      expect(body.get("file")).toBeInstanceOf(File);
      return Response.json({
        text: "I'd like to visit art because I love painting.",
        logprobs: [
          { token: " art", logprob: -0.01 },
          { token: " painting", logprob: -0.02 },
        ],
      });
    });
    const audio = new File([new Uint8Array(512)], "answer.webm", { type: "audio/webm" });

    const feedback = await transcribeSession1Speaking({
      audio,
      promptId: "station-choice",
      stationId: "art",
      fetchImpl: fetchImpl as typeof fetch,
    });

    expect(feedback.status).toBe("clear");
    expect(feedback.heardParts.every((part) => part.heard)).toBe(true);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("returns supportive low-confidence cues without phoneme claims", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const audio = new File([new Uint8Array(512)], "answer.webm", { type: "audio/webm" });
    const feedback = await transcribeSession1Speaking({
      audio,
      promptId: "baseline",
      fetchImpl: vi.fn(async () => Response.json({
        text: "My name is Mia. I am nine years old and I like football.",
        logprobs: [{ token: " football", logprob: -1.5 }],
      })) as typeof fetch,
    });

    expect(feedback.status).toBe("developing");
    expect(feedback.clarityCues).toHaveLength(1);
    expect(feedback.clarityCues[0]?.text).toBe("football");
    expect(feedback.clarityCues[0]?.confidence).toBeCloseTo(Math.exp(-1.5), 5);
    expect(feedback.message).toContain("highlighted");
  });

  it("fails closed when the server key is missing", async () => {
    delete process.env.OPENAI_API_KEY;
    const audio = new File([new Uint8Array(512)], "answer.webm", { type: "audio/webm" });

    await expect(transcribeSession1Speaking({
      audio,
      promptId: "baseline",
      fetchImpl: vi.fn() as typeof fetch,
    })).rejects.toMatchObject({ kind: "configuration" });
  });
});
