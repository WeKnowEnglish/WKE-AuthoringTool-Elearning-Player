"use client";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
  }
  return ctx;
}

function beep(freq: number, duration: number, type: OscillatorType = "sine") {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = 0.08;
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duration);
}

export function playSfx(
  key: "tap" | "correct" | "wrong" | "complete",
  muted: boolean,
) {
  if (muted) return;
  switch (key) {
    case "tap":
      beep(440, 0.04);
      break;
    case "correct":
      beep(523, 0.08);
      setTimeout(() => beep(659, 0.1), 60);
      break;
    case "wrong":
      beep(180, 0.12, "square");
      break;
    case "complete":
      beep(392, 0.1);
      setTimeout(() => beep(523, 0.12), 100);
      setTimeout(() => beep(659, 0.18), 220);
      break;
    default:
      break;
  }
}
