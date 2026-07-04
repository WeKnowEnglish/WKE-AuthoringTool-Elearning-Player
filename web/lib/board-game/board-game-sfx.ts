"use client";

import { playSfx, primeAudioOutput } from "@/lib/audio/sfx";

function beepSequence(
  muted: boolean,
  steps: { freq: number; duration: number; delay?: number; type?: OscillatorType }[],
) {
  if (muted) return;
  primeAudioOutput();
  steps.forEach(({ freq, duration, delay = 0, type = "sine" }) => {
    setTimeout(() => {
      if (typeof window === "undefined") return;
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const c = new Ctx();
      if (c.state === "suspended") void c.resume();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = 0.07;
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + duration);
    }, delay);
  });
}

export function playBoardGameSfx(
  key:
    | "dice"
    | "hop"
    | "land"
    | "correct"
    | "wrong"
    | "victory"
    | "turn"
    | "lucky"
    | "penalty"
    | "tap",
  muted: boolean,
) {
  switch (key) {
    case "dice":
      beepSequence(muted, [
        { freq: 300, duration: 0.04, delay: 0 },
        { freq: 420, duration: 0.04, delay: 80 },
        { freq: 360, duration: 0.04, delay: 160 },
        { freq: 500, duration: 0.08, delay: 320 },
      ]);
      break;
    case "hop":
      beepSequence(muted, [{ freq: 520, duration: 0.05 }]);
      break;
    case "land":
      beepSequence(muted, [{ freq: 280, duration: 0.1, type: "triangle" }]);
      break;
    case "turn":
      beepSequence(muted, [
        { freq: 440, duration: 0.08 },
        { freq: 554, duration: 0.1, delay: 100 },
      ]);
      break;
    case "lucky":
      beepSequence(muted, [
        { freq: 659, duration: 0.08 },
        { freq: 784, duration: 0.1, delay: 90 },
      ]);
      break;
    case "penalty":
      beepSequence(muted, [{ freq: 160, duration: 0.15, type: "square" }]);
      break;
    case "correct":
      playSfx("correct", muted);
      break;
    case "wrong":
      playSfx("wrong", muted);
      break;
    case "victory":
      playSfx("complete", muted);
      break;
    case "tap":
      playSfx("tap", muted);
      break;
    default:
      break;
  }
}
