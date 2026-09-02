import {
  analyzeSession1Speaking,
  type Session1SpeakingFeedback,
  type Session1SpeakingPromptId,
  type TranscriptionToken,
} from "./session-1-speaking-feedback";

const DEFAULT_MODEL = "gpt-4o-mini-transcribe";
const LOGPROB_MODELS = new Set([
  "gpt-4o-transcribe",
  "gpt-4o-mini-transcribe",
  "gpt-4o-mini-transcribe-2025-12-15",
]);

type FetchLike = typeof fetch;

export class Session1TranscriptionServiceError extends Error {
  constructor(
    message: string,
    public readonly kind: "configuration" | "upstream" | "invalid_response",
    public readonly status?: number,
  ) {
    super(message);
    this.name = "Session1TranscriptionServiceError";
  }
}

function transcriptionModel() {
  const configured = process.env.OPENAI_TRANSCRIPTION_MODEL?.trim();
  if (!configured) return DEFAULT_MODEL;
  return LOGPROB_MODELS.has(configured) ? configured : DEFAULT_MODEL;
}

function transcriptionTokens(value: unknown): TranscriptionToken[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 200).flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const token = "token" in item && typeof item.token === "string" ? item.token : "";
    const logprob = "logprob" in item && typeof item.logprob === "number" ? item.logprob : Number.NaN;
    if (!token || !Number.isFinite(logprob)) return [];
    return [{ token: token.slice(0, 80), logprob }];
  });
}

export async function transcribeSession1Speaking(input: {
  audio: File;
  promptId: Session1SpeakingPromptId;
  stationId?: string | null;
  fetchImpl?: FetchLike;
}): Promise<Session1SpeakingFeedback> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Session1TranscriptionServiceError(
      "Speech feedback is not configured.",
      "configuration",
    );
  }

  const body = new FormData();
  body.set("file", input.audio, input.audio.name);
  body.set("model", transcriptionModel());
  body.set("language", "en");
  body.set("response_format", "json");
  body.append("include[]", "logprobs");

  let response: Response;
  try {
    response = await (input.fetchImpl ?? fetch)("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body,
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    throw new Session1TranscriptionServiceError(
      error instanceof Error && error.name === "TimeoutError"
        ? "Speech feedback timed out."
        : "Speech feedback could not connect.",
      "upstream",
    );
  }

  if (!response.ok) {
    throw new Session1TranscriptionServiceError(
      "Speech feedback was unavailable.",
      "upstream",
      response.status,
    );
  }

  const payload = await response.json().catch(() => null);
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    !("text" in payload) ||
    typeof payload.text !== "string"
  ) {
    throw new Session1TranscriptionServiceError(
      "Speech feedback returned an invalid response.",
      "invalid_response",
    );
  }

  return analyzeSession1Speaking({
    promptId: input.promptId,
    stationId: input.stationId,
    transcript: payload.text,
    tokens: transcriptionTokens("logprobs" in payload ? payload.logprobs : null),
  });
}
