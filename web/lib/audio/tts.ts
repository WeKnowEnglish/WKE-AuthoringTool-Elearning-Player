"use client";

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

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };

    stopSpeaking();
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = opts?.lang ?? "en-US";
    u.rate = 0.92;
    u.onend = () => finish(true);
    u.onerror = () => finish(false);

    if (opts?.signal) {
      if (opts.signal.aborted) {
        finish(false);
        return;
      }
      opts.signal.addEventListener(
        "abort",
        () => {
          stopSpeaking();
          finish(false);
        },
        { once: true },
      );
    }

    window.speechSynthesis.speak(u);
  });
}
