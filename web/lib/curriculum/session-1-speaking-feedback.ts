export const SESSION_1_SPEAKING_PROMPT_IDS = ["station-choice", "baseline"] as const;

export type Session1SpeakingPromptId = (typeof SESSION_1_SPEAKING_PROMPT_IDS)[number];

export type TranscriptionToken = {
  token: string;
  logprob: number;
};

export type SpeakingEvidencePart = {
  id: string;
  label: string;
  heard: boolean;
};

export type SpeakingClarityCue = {
  text: string;
  confidence: number;
};

export type Session1SpeakingFeedback = {
  promptId: Session1SpeakingPromptId;
  transcript: string;
  status: "clear" | "developing" | "try_again";
  title: string;
  message: string;
  heardParts: SpeakingEvidencePart[];
  clarityCues: SpeakingClarityCue[];
  checkedAt: string;
};

const STATION_WORDS: Record<string, string[]> = {
  sports: ["sport", "sports", "football", "soccer", "ball"],
  art: ["art", "paint", "painting", "draw", "drawing", "colour", "color"],
  books: ["book", "books", "read", "reading", "story", "stories"],
  pets: ["pet", "pets", "animal", "animals", "hamster", "dog", "cat"],
  music: ["music", "musical", "keyboard", "guitar", "sing", "singing"],
};

const NUMBER_WORDS = new Set([
  "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen",
]);

function words(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .match(/[a-z0-9]+/g) ?? [];
}

function includesAny(input: string[], candidates: string[]) {
  return candidates.some((candidate) => input.some((word) => word === candidate || word.startsWith(candidate)));
}

function meaningfulLowConfidenceTokens(tokens: TranscriptionToken[]) {
  return tokens
    .map((item) => ({
      text: item.token.replace(/^\s+|[.,!?;:]+$/g, "").trim(),
      confidence: Math.max(0, Math.min(1, Math.exp(item.logprob))),
    }))
    .filter((item) => /^[A-Za-z][A-Za-z'-]{2,}$/.test(item.text) && item.confidence < 0.35)
    .filter((item, index, items) => items.findIndex((candidate) => candidate.text.toLowerCase() === item.text.toLowerCase()) === index)
    .sort((a, b) => a.confidence - b.confidence)
    .slice(0, 3);
}

export function analyzeSession1Speaking(input: {
  promptId: Session1SpeakingPromptId;
  transcript: string;
  tokens?: TranscriptionToken[];
  stationId?: string | null;
  checkedAt?: string;
}): Session1SpeakingFeedback {
  const transcript = input.transcript.trim().replace(/\s+/g, " ").slice(0, 500);
  const transcriptWords = words(transcript);
  const clarityCues = meaningfulLowConfidenceTokens(input.tokens ?? []);
  let heardParts: SpeakingEvidencePart[];

  if (input.promptId === "station-choice") {
    const stationWords = STATION_WORDS[input.stationId ?? ""] ?? [];
    const hasPreference = includesAny(transcriptWords, ["like", "visit", "choose", "want", "would"]);
    const hasStation = stationWords.length === 0 ? transcriptWords.length >= 2 : includesAny(transcriptWords, stationWords);
    const becauseIndex = transcriptWords.indexOf("because");
    const hasReason = becauseIndex >= 0 && transcriptWords.length > becauseIndex + 1;
    heardParts = [
      { id: "preference", label: "your choice", heard: hasPreference },
      { id: "station", label: "the station", heard: hasStation },
      { id: "reason", label: "a reason", heard: hasReason },
    ];
  } else {
    const hasName = /\b(my name is|i am|im)\b/i.test(transcript.replace(/[’']/g, ""));
    const hasAge = transcriptWords.some((word) => /^\d{1,2}$/.test(word) || NUMBER_WORDS.has(word)) || /years? old/i.test(transcript);
    const hasInterest = /\b(i like|i love|my favou?rite)\b/i.test(transcript);
    heardParts = [
      { id: "name", label: "your name", heard: hasName },
      { id: "age", label: "your age", heard: hasAge },
      { id: "interest", label: "something you like", heard: hasInterest },
    ];
  }

  const heardCount = heardParts.filter((part) => part.heard).length;
  const status = transcriptWords.length < 2
    ? "try_again"
    : heardCount === heardParts.length && clarityCues.length === 0
      ? "clear"
      : "developing";
  const title = status === "clear"
    ? "Keelan heard you clearly!"
    : status === "try_again"
      ? "Let’s try one more time"
      : "Good speaking—one small power-up";
  const missing = heardParts.filter((part) => !part.heard).map((part) => part.label);
  const message = status === "clear"
    ? "Your message had all the important parts."
    : missing.length > 0
      ? `Keelan is still listening for ${missing.join(" and ")}.`
      : "Try saying the highlighted part a little more slowly and clearly.";

  return {
    promptId: input.promptId,
    transcript,
    status,
    title,
    message,
    heardParts,
    clarityCues,
    checkedAt: input.checkedAt ?? new Date().toISOString(),
  };
}

export function normalizeSession1SpeakingFeedback(value: unknown): Session1SpeakingFeedback | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (!SESSION_1_SPEAKING_PROMPT_IDS.includes(input.promptId as Session1SpeakingPromptId)) return null;
  const transcript = typeof input.transcript === "string" ? input.transcript.trim().slice(0, 500) : "";
  if (!transcript) return null;
  const status = input.status === "clear" || input.status === "try_again" ? input.status : "developing";
  const heardParts = Array.isArray(input.heardParts)
    ? input.heardParts.slice(0, 5).flatMap((part) => {
        if (!part || typeof part !== "object" || Array.isArray(part)) return [];
        const candidate = part as Record<string, unknown>;
        if (typeof candidate.id !== "string" || typeof candidate.label !== "string") return [];
        return [{ id: candidate.id.slice(0, 40), label: candidate.label.slice(0, 80), heard: candidate.heard === true }];
      })
    : [];
  const clarityCues = Array.isArray(input.clarityCues)
    ? input.clarityCues.slice(0, 3).flatMap((cue) => {
        if (!cue || typeof cue !== "object" || Array.isArray(cue)) return [];
        const candidate = cue as Record<string, unknown>;
        if (typeof candidate.text !== "string" || typeof candidate.confidence !== "number") return [];
        return [{ text: candidate.text.slice(0, 40), confidence: Math.max(0, Math.min(1, candidate.confidence)) }];
      })
    : [];
  return {
    promptId: input.promptId as Session1SpeakingPromptId,
    transcript,
    status,
    title: typeof input.title === "string" ? input.title.slice(0, 120) : "Speaking feedback",
    message: typeof input.message === "string" ? input.message.slice(0, 240) : "Listen back and try again if you want to.",
    heardParts,
    clarityCues,
    checkedAt: typeof input.checkedAt === "string" ? input.checkedAt.slice(0, 40) : "",
  };
}
