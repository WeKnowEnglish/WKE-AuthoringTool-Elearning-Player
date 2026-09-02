"use client";

const SPEAK_TIMEOUT_MS = 20_000;
const CHROME_KEEPALIVE_MS = 4_000;
/** Chrome often drops speak() if it runs in the same tick as cancel(). */
const SPEAK_AFTER_CANCEL_MS = 50;
let speechRequestGeneration = 0;

/** Chrome/Edge often start with synthesis paused until resume() after a user gesture. */
export function prepareSpeechSynthesis(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.resume();
    void window.speechSynthesis.getVoices();
  } catch {
    /* ignore */
  }
}

/**
 * Prime speech during a user gesture (open puppet, Continue, food tap).
 * Prefer resume + voices only — a dummy utterance that gets cancel()'d
 * immediately can clear Chrome's user-gesture unlock and silence the next speak().
 */
export function unlockSpeechSynthesis(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  prepareSpeechSynthesis();
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
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

export function stopSpeaking() {
  speechRequestGeneration += 1;
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore cancelled / interrupted speech */
  }
}

export function speakText(
  text: string,
  opts?: { lang?: string; muted?: boolean; rate?: number },
): boolean {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;
  if (opts?.muted) return false;
  const clean = text.trim();
  if (!clean) return false;
  prepareSpeechSynthesis();
  const needsGap = window.speechSynthesis.speaking || window.speechSynthesis.pending;
  stopSpeaking();
  const requestGeneration = speechRequestGeneration;
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = opts?.lang ?? "en-US";
  u.rate = opts?.rate ?? 0.92;
  const start = () => {
    if (requestGeneration !== speechRequestGeneration) return;
    try {
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(u);
    } catch {
      /* ignore */
    }
  };
  if (needsGap) {
    window.setTimeout(start, SPEAK_AFTER_CANCEL_MS);
  } else {
    start();
  }
  return true;
}

export function speakTextAndWait(
  text: string,
  opts?: { lang?: string; muted?: boolean; signal?: AbortSignal; rate?: number },
): Promise<boolean> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve(false);
  }
  if (opts?.muted) return Promise.resolve(false);
  const clean = text.trim();
  if (!clean) return Promise.resolve(false);

  return waitForVoices().then(async () => {
    if (opts?.signal?.aborted) return false;

    prepareSpeechSynthesis();
    const needsGap = window.speechSynthesis.speaking || window.speechSynthesis.pending;
    stopSpeaking();
    const requestGeneration = speechRequestGeneration;
    if (needsGap) {
      await delay(SPEAK_AFTER_CANCEL_MS);
      if (opts?.signal?.aborted || requestGeneration !== speechRequestGeneration) return false;
    }

    return new Promise<boolean>((resolve) => {
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
        resolve(ok);
      };

      if (opts?.signal?.aborted || requestGeneration !== speechRequestGeneration) {
        finish(false);
        return;
      }

      const u = new SpeechSynthesisUtterance(clean);
      u.lang = opts?.lang ?? "en-US";
      u.rate = opts?.rate ?? 0.92;
      u.onend = () => finish(true);
      u.onerror = (event) => {
        // Interrupted by a newer speak/cancel — treat as not completed.
        if (event.error === "interrupted" || event.error === "canceled") {
          finish(false);
          return;
        }
        finish(false);
      };

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
      if (requestGeneration !== speechRequestGeneration) {
        finish(false);
        return;
      }
      try {
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(u);
      } catch {
        finish(false);
      }
    });
  });
}
