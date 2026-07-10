import { prepareSpeechSynthesis, stopSpeaking } from "@/lib/audio/tts";

export type SpeakSyllableMode = "normal" | "slow";

export const SYLLABLE_SPEECH_RATES: Record<SpeakSyllableMode, { rate: number }> = {
  normal: { rate: 0.92 },
  slow: { rate: 0.62 },
};

const SPEAK_TIMEOUT_MS = 20_000;
const CHROME_KEEPALIVE_MS = 4_000;

export function normalizeSpeakSyllables(syllables: string[]): string[] {
  return syllables.map((part) => part.trim()).filter(Boolean);
}

export function getSyllableSpeechTiming(mode: SpeakSyllableMode): { rate: number } {
  return SYLLABLE_SPEECH_RATES[mode];
}

/** Rough duration estimate for scheduling syllable highlights over one spoken word. */
export function estimateWordSpeechDurationMs(word: string, rate: number): number {
  const clean = word.trim();
  if (!clean) return 0;
  const msPerChar = 88 / Math.max(rate, 0.1);
  return Math.max(320, clean.length * msPerChar);
}

/** Millisecond offsets (from speech start) when each syllable highlight should begin. */
export function buildSyllableHighlightOffsetsMs(
  syllables: string[],
  durationMs: number,
): number[] {
  const parts = normalizeSpeakSyllables(syllables);
  if (parts.length === 0) return [];
  if (parts.length === 1) return [0];

  const totalChars = parts.reduce((sum, part) => sum + part.length, 0);
  if (totalChars === 0) {
    const slot = durationMs / parts.length;
    return parts.map((_, index) => index * slot);
  }

  let elapsed = 0;
  return parts.map((part) => {
    const start = elapsed;
    elapsed += (part.length / totalChars) * durationMs;
    return start;
  });
}

function waitForVoices(timeoutMs = 800): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve();
  }
  if (window.speechSynthesis.getVoices().length > 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const done = () => {
      synth.removeEventListener("voiceschanged", done);
      clearTimeout(timer);
      resolve();
    };
    synth.addEventListener("voiceschanged", done);
    const timer = window.setTimeout(done, timeoutMs);
  });
}

function startChromeSpeechKeepAlive(): () => void {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return () => {};
  }
  const synth = window.speechSynthesis;
  const id = window.setInterval(() => {
    if (!synth.speaking) return;
    try {
      synth.pause();
      synth.resume();
    } catch {
      /* ignore */
    }
  }, CHROME_KEEPALIVE_MS);
  return () => window.clearInterval(id);
}

export type SpeakWordWithHighlightsOptions = {
  word: string;
  syllables: string[];
  mode: SpeakSyllableMode;
  muted?: boolean;
  lang?: string;
  signal?: AbortSignal;
  onSyllableStart?: (index: number) => void;
  onDone?: (completed: boolean) => void;
};

export async function speakWordWithSyllableHighlights({
  word,
  syllables,
  mode,
  muted = false,
  lang = "en-US",
  signal,
  onSyllableStart,
  onDone,
}: SpeakWordWithHighlightsOptions): Promise<boolean> {
  const cleanWord = word.trim();
  const parts = normalizeSpeakSyllables(syllables);
  if (!cleanWord || parts.length === 0) {
    onDone?.(false);
    return false;
  }
  if (muted || typeof window === "undefined" || !window.speechSynthesis) {
    onDone?.(false);
    return false;
  }
  if (signal?.aborted) {
    onDone?.(false);
    return false;
  }

  const { rate } = getSyllableSpeechTiming(mode);

  return waitForVoices().then(
    () =>
      new Promise<boolean>((resolve) => {
        let settled = false;
        let stopKeepAlive: (() => void) | undefined;
        let timeoutId: number | undefined;
        const highlightTimers: ReturnType<typeof setTimeout>[] = [];

        const clearHighlightTimers = () => {
          for (const timer of highlightTimers) clearTimeout(timer);
          highlightTimers.length = 0;
        };

        const finish = (ok: boolean) => {
          if (settled) return;
          settled = true;
          clearHighlightTimers();
          stopKeepAlive?.();
          if (timeoutId !== undefined) {
            window.clearTimeout(timeoutId);
          }
          onDone?.(ok);
          resolve(ok);
        };

        const scheduleHighlights = () => {
          const durationMs = estimateWordSpeechDurationMs(cleanWord, rate);
          const offsets = buildSyllableHighlightOffsetsMs(parts, durationMs);
          for (const [index, offset] of offsets.entries()) {
            const timer = setTimeout(() => {
              if (signal?.aborted) return;
              onSyllableStart?.(index);
            }, offset);
            highlightTimers.push(timer);
          }
        };

        if (signal?.aborted) {
          finish(false);
          return;
        }

        prepareSpeechSynthesis();
        stopSpeaking();

        const utterance = new SpeechSynthesisUtterance(cleanWord);
        utterance.lang = lang;
        utterance.rate = rate;
        utterance.onstart = () => scheduleHighlights();
        utterance.onend = () => finish(true);
        utterance.onerror = () => finish(false);

        timeoutId = window.setTimeout(() => finish(true), SPEAK_TIMEOUT_MS);

        if (signal) {
          signal.addEventListener(
            "abort",
            () => {
              clearHighlightTimers();
              stopKeepAlive?.();
              stopSpeaking();
              finish(false);
            },
            { once: true },
          );
        }

        stopKeepAlive = startChromeSpeechKeepAlive();
        window.speechSynthesis.speak(utterance);
      }),
  );
}

export async function speakWordWithMode(
  word: string,
  mode: SpeakSyllableMode,
  opts?: {
    muted?: boolean;
    lang?: string;
    signal?: AbortSignal;
    onDone?: (completed: boolean) => void;
  },
): Promise<boolean> {
  const clean = word.trim();
  if (!clean) {
    opts?.onDone?.(false);
    return false;
  }
  if (opts?.muted || typeof window === "undefined" || !window.speechSynthesis) {
    opts?.onDone?.(false);
    return false;
  }
  if (opts?.signal?.aborted) {
    opts?.onDone?.(false);
    return false;
  }

  const { rate } = getSyllableSpeechTiming(mode);

  return waitForVoices().then(
    () =>
      new Promise<boolean>((resolve) => {
        let settled = false;
        let stopKeepAlive: (() => void) | undefined;
        let timeoutId: number | undefined;
        const finish = (ok: boolean) => {
          if (settled) return;
          settled = true;
          stopKeepAlive?.();
          if (timeoutId !== undefined) {
            window.clearTimeout(timeoutId);
          }
          opts?.onDone?.(ok);
          resolve(ok);
        };

        if (opts?.signal?.aborted) {
          finish(false);
          return;
        }

        prepareSpeechSynthesis();
        stopSpeaking();

        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.lang = opts?.lang ?? "en-US";
        utterance.rate = rate;
        utterance.onend = () => finish(true);
        utterance.onerror = () => finish(false);

        timeoutId = window.setTimeout(() => finish(true), SPEAK_TIMEOUT_MS);

        if (opts?.signal) {
          opts.signal.addEventListener(
            "abort",
            () => {
              stopKeepAlive?.();
              stopSpeaking();
              finish(false);
            },
            { once: true },
          );
        }

        stopKeepAlive = startChromeSpeechKeepAlive();
        window.speechSynthesis.speak(utterance);
      }),
  );
}

export function abortSyllableSpeech(controller: AbortController | null): void {
  if (controller) {
    controller.abort();
    return;
  }
  stopSpeaking();
}
