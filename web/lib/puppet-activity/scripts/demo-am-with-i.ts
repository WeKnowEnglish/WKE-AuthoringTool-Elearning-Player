import type { PuppetScript } from "../types";

export const DEMO_AM_WITH_I: PuppetScript = {
  id: "demo_am_with_i",
  title: "Am with I",
  puppetId: "default_host",
  ttsLang: "en-US",
  defaultCaptionLayout: {
    xPercent: 50,
    yPercent: 78,
    scale: 1,
    widthPercent: 88,
  },
  beats: [
    {
      kind: "line",
      text: "Hi! Today we learn a little grammar.",
      puppetAnimation: "wave",
      wordStaggerMs: 120,
      captionLayout: { xPercent: 50, yPercent: 82, scale: 1 },
    },
    { kind: "pause" },
    {
      kind: "line",
      text: "We use am with I.",
      wordStaggerMs: 150,
      puppetAnimation: "nod",
      captionLayout: { xPercent: 68, yPercent: 48, scale: 0.95, widthPercent: 72 },
    },
    { kind: "pause" },
    {
      kind: "line",
      text: "I am happy. I am ready.",
      wordStaggerMs: 130,
      captionLayout: { xPercent: 32, yPercent: 38, scale: 0.92, widthPercent: 70 },
    },
    { kind: "pause" },
    {
      kind: "quiz_true_false",
      statement: "We use are with I.",
      correct: false,
    },
  ],
};
