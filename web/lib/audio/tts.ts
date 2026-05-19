"use client";

const SPEAK_TIMEOUT_MS = 20_000;
const CHROME_KEEPALIVE_MS = 4_000;

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
 * Browsers often block the first speak() scheduled from useEffect alone.
 */
export function unlockSpeechSynthesis(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  prepareSpeechSynthesis();
  try {
    const u = new SpeechSynthesisUtterance("\u200b");
    u.volume = 0.01;
    u.rate = 2;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
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

export function stopSpeaking() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

export function speakText(
  text: string,
  opts?: { lang?: string; muted?: boolean },
): boolean {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;
  if (opts?.muted) return false;
  const clean = text.trim();
  if (!clean) return false;
  prepareSpeechSynthesis();
  stopSpeaking();
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = opts?.lang ?? "en-US";
  u.rate = 0.92;
  window.speechSynthesis.speak(u);
  return true;
}

export function speakTextAndWait(
  text: string,
  opts?: { lang?: string; muted?: boolean; signal?: AbortSignal },
): Promise<boolean> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve(false);
  }
  if (opts?.muted) return Promise.resolve(false);
  const clean = text.trim();
  if (!clean) return Promise.resolve(false);

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
          resolve(ok);
        };

        if (opts?.signal?.aborted) {
          finish(false);
          return;
        }

        prepareSpeechSynthesis();
        stopSpeaking();

        const u = new SpeechSynthesisUtterance(clean);
        u.lang = opts?.lang ?? "en-US";
        u.rate = 0.92;
        u.onend = () => finish(true);
        u.onerror = () => finish(false);

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
        window.speechSynthesis.speak(u);
      }),
  );
}
