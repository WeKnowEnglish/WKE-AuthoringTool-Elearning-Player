"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Headphones,
  Mic,
  RotateCcw,
  Sparkles,
  Square,
  Volume2,
} from "lucide-react";

type StationId = "sports" | "art" | "books" | "pets" | "music" | "badges";
type Anchor = "close_left" | "close_right" | "lower_left" | "lower_right" | "center_close";

type StageStep = {
  id: string;
  eyebrow: string;
  line: string;
  helper?: string;
  anchor: Anchor;
  facing: "left" | "right" | "front";
  characterScale: number;
  dim: number;
  focus?: StationId;
  action: "continue" | "tap_target" | "observe" | "choose" | "question" | "record" | "reflect" | "complete";
};

const STATIONS: Record<
  StationId,
  { label: string; short: string; left: number; top: number; width: number; height: number }
> = {
  sports: { label: "Sports station", short: "sports", left: 0.5, top: 29, width: 18, height: 55 },
  art: { label: "Art station", short: "painting", left: 17, top: 28, width: 18, height: 48 },
  books: { label: "Book station", short: "reading", left: 34, top: 29, width: 22, height: 43 },
  pets: { label: "Pet station", short: "pets", left: 55, top: 29, width: 21, height: 39 },
  music: { label: "Music station", short: "music", left: 77, top: 28, width: 22, height: 38 },
  badges: { label: "Badge-making table", short: "making badges", left: 61, top: 57, width: 38, height: 42 },
};

const STEPS: StageStep[] = [
  {
    id: "welcome",
    eyebrow: "Welcome Fair",
    line: "Hi! I’m glad you’re here. This fair is full of new friends.",
    helper: "Tap continue when you’re ready to explore.",
    anchor: "close_right",
    facing: "left",
    characterScale: 132,
    dim: 0.48,
    action: "continue",
  },
  {
    id: "badge-mission",
    eyebrow: "Your first mission",
    line: "My friend badge is empty. Can you find the table where children are making badges?",
    helper: "Tap the correct place in the picture.",
    anchor: "close_left",
    facing: "right",
    characterScale: 128,
    dim: 0.46,
    focus: "badges",
    action: "tap_target",
  },
  {
    id: "observe",
    eyebrow: "Look closely",
    line: "Great! Now look around by yourself. What do you notice first?",
    helper: "Tap any activity that interests you.",
    anchor: "lower_right",
    facing: "left",
    characterScale: 70,
    dim: 0.05,
    action: "observe",
  },
  {
    id: "sports",
    eyebrow: "Meet the fair",
    line: "This boy likes playing football. He has got a black-and-white ball.",
    helper: "Tap the sports station.",
    anchor: "close_right",
    facing: "left",
    characterScale: 120,
    dim: 0.42,
    focus: "sports",
    action: "tap_target",
  },
  {
    id: "art",
    eyebrow: "Meet the fair",
    line: "She likes painting. Look at all the colours on her table!",
    helper: "Tap the art station.",
    anchor: "close_right",
    facing: "left",
    characterScale: 116,
    dim: 0.42,
    focus: "art",
    action: "tap_target",
  },
  {
    id: "books",
    eyebrow: "Meet the fair",
    line: "These friends enjoy reading. They are sharing their favourite books.",
    helper: "Tap the book station.",
    anchor: "close_left",
    facing: "right",
    characterScale: 116,
    dim: 0.42,
    focus: "books",
    action: "tap_target",
  },
  {
    id: "pets",
    eyebrow: "Meet the fair",
    line: "This child has got a pet picture. Which animal can you see?",
    helper: "Tap the pet station.",
    anchor: "close_left",
    facing: "right",
    characterScale: 116,
    dim: 0.42,
    focus: "pets",
    action: "tap_target",
  },
  {
    id: "music",
    eyebrow: "Meet the fair",
    line: "They can play music together. One plays the keyboard and one plays the guitar.",
    helper: "Tap the music station.",
    anchor: "close_left",
    facing: "right",
    characterScale: 116,
    dim: 0.42,
    focus: "music",
    action: "tap_target",
  },
  {
    id: "choose",
    eyebrow: "Make it personal",
    line: "Which station would you visit? Choose one and tell me why.",
    helper: "There is no wrong choice.",
    anchor: "lower_left",
    facing: "right",
    characterScale: 68,
    dim: 0.18,
    action: "choose",
  },
  {
    id: "question",
    eyebrow: "Picture talk",
    line: "Complete the sentence: She likes…",
    helper: "Use the picture to choose the best answer.",
    anchor: "lower_right",
    facing: "left",
    characterScale: 65,
    dim: 0.34,
    focus: "art",
    action: "question",
  },
  {
    id: "record",
    eyebrow: "Your first speaking sample",
    line: "Tell me your name or explorer name, your age, and one thing you like.",
    helper: "This is a starting sample, not a test. Listen back and keep the version you want.",
    anchor: "lower_left",
    facing: "right",
    characterScale: 60,
    dim: 0.18,
    action: "record",
  },
  {
    id: "reflect",
    eyebrow: "Think about your learning",
    line: "You spoke English at the Welcome Fair. How did speaking feel today?",
    helper: "Choose the answer that feels true for you.",
    anchor: "center_close",
    facing: "front",
    characterScale: 112,
    dim: 0.52,
    action: "reflect",
  },
  {
    id: "complete",
    eyebrow: "Session complete",
    line: "You helped me meet new friends—and you made a great start too!",
    helper: "Your next visit will build bigger answers and friendly questions.",
    anchor: "close_right",
    facing: "left",
    characterScale: 125,
    dim: 0.44,
    action: "complete",
  },
];

const ANCHOR_STYLE: Record<Anchor, { left: string; bottom: string; width: string; height: string }> = {
  close_left: { left: "-7%", bottom: "-34%", width: "42%", height: "142%" },
  close_right: { left: "70%", bottom: "-34%", width: "42%", height: "142%" },
  lower_left: { left: "1%", bottom: "-13%", width: "24%", height: "82%" },
  lower_right: { left: "78%", bottom: "-13%", width: "24%", height: "82%" },
  center_close: { left: "35%", bottom: "-35%", width: "32%", height: "140%" },
};

function useLocalVoiceRecorder(maxSeconds = 20) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  function clear() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setError(null);
  }

  function stop() {
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  async function start() {
    clear();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Voice recording is not available on this device.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
        setRecording(false);
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start(250);
      setRecording(true);
      timerRef.current = window.setTimeout(stop, maxSeconds * 1000);
    } catch {
      setError("Microphone access was blocked. You can allow it and try again.");
    }
  }

  useEffect(
    () => () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    },
    [audioUrl],
  );

  return { recording, audioUrl, error, start, stop, clear };
}

function Mascot({ step }: { step: StageStep }) {
  const anchor = ANCHOR_STYLE[step.anchor];
  const faceTransform =
    step.facing === "left" ? "scaleX(-1)" : step.facing === "right" ? "scaleX(1)" : "scaleX(1)";
  return (
    <div
      className="pointer-events-none absolute z-30 transition-all duration-700 ease-out motion-reduce:duration-150"
      style={{ ...anchor, transform: faceTransform }}
      aria-hidden
    >
      <div className="relative h-full w-full" style={{ transform: `scale(${step.characterScale / 125})`, transformOrigin: "bottom center" }}>
        <Image
          src="/landing/primary-mascot.png"
          alt=""
          fill
          priority
          className="object-contain object-bottom drop-shadow-[0_14px_18px_rgba(30,20,70,0.28)]"
          unoptimized
        />
      </div>
    </div>
  );
}

export function Grade4Session1Pilot({ pilotMode = false }: { pilotMode?: boolean }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [stationChoice, setStationChoice] = useState<StationId | null>(null);
  const [questionCorrect, setQuestionCorrect] = useState(false);
  const [reflection, setReflection] = useState<string | null>(null);
  const voice = useLocalVoiceRecorder(20);
  const step = STEPS[stepIndex] ?? STEPS[0];
  const progress = Math.round(((stepIndex + 1) / STEPS.length) * 100);

  const focusRegion = step.focus ? STATIONS[step.focus] : null;
  const selectedLabel = stationChoice ? STATIONS[stationChoice].short : null;

  const canContinue = useMemo(() => {
    if (step.action === "record") return Boolean(voice.audioUrl || voice.error);
    if (step.action === "reflect") return Boolean(reflection);
    if (step.action === "question") return questionCorrect;
    if (step.action === "choose") return Boolean(stationChoice);
    return step.action === "continue";
  }, [questionCorrect, reflection, stationChoice, step.action, voice.audioUrl, voice.error]);

  function advance() {
    setMessage(null);
    setStepIndex((current) => Math.min(STEPS.length - 1, current + 1));
  }

  function reset() {
    voice.clear();
    setStepIndex(0);
    setMessage(null);
    setStationChoice(null);
    setQuestionCorrect(false);
    setReflection(null);
  }

  function handleStation(id: StationId) {
    if (step.action === "observe") {
      setMessage(`You noticed the ${STATIONS[id].label.toLowerCase()}. Good looking!`);
      window.setTimeout(advance, 650);
      return;
    }
    if (step.action === "tap_target") {
      if (step.focus === id) {
        setMessage("That’s it!");
        window.setTimeout(advance, 650);
      } else {
        setMessage("Good looking. Try the glowing part of the scene.");
      }
    }
  }

  return (
    <main className="min-h-dvh bg-[#171229] px-2 py-3 text-slate-900 sm:px-4 sm:py-5">
      <div className="mx-auto flex w-full max-w-[88rem] flex-col gap-3">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-xl">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={pilotMode ? "/pilots/grade-4-learning-paths" : "/primary/learn/grade-4"}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-800"
              aria-label="Back to Grade 4 learning paths"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <p className="truncate text-xs font-black uppercase tracking-[0.14em] text-violet-700">Unit 1 · Session 1</p>
              <h1 className="truncate text-lg font-black sm:text-xl">Enter the Welcome Fair</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {pilotMode ? (
              <span className="hidden rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900 sm:inline">Pilot · local voice playback</span>
            ) : null}
            <button type="button" onClick={reset} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-600">
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
          </div>
          <div className="basis-full">
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-violet-600 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </header>

        <section className="relative overflow-hidden rounded-[1.75rem] border-4 border-white/80 bg-slate-900 shadow-2xl">
          <div className="relative aspect-[16/9] min-h-[31rem] w-full overflow-hidden sm:min-h-0">
            <Image
              src="/curriculum/grade-4-movers/unit-1/welcome-fair.png"
              alt="A busy school Welcome Fair with sports, art, books, pets, music, and badge-making stations"
              fill
              priority
              className="object-cover"
              unoptimized
            />

            {focusRegion ? (
              <div
                className="pointer-events-none absolute z-10 rounded-2xl border-4 border-amber-300 transition-all duration-300 motion-reduce:duration-0"
                style={{
                  left: `${focusRegion.left}%`,
                  top: `${focusRegion.top}%`,
                  width: `${focusRegion.width}%`,
                  height: `${focusRegion.height}%`,
                  boxShadow: `0 0 0 9999px rgba(12, 9, 28, ${step.dim})`,
                }}
              >
                <span className="absolute -top-3 left-3 rounded-full bg-amber-300 px-3 py-1 text-xs font-black text-violet-950 shadow-lg">
                  {focusRegion.label}
                </span>
              </div>
            ) : step.dim > 0 ? (
              <div className="pointer-events-none absolute inset-0 z-10 bg-[#0c091c] transition-opacity duration-300" style={{ opacity: step.dim }} />
            ) : null}

            <div className="absolute inset-0 z-20">
              {(Object.entries(STATIONS) as Array<[StationId, (typeof STATIONS)[StationId]]>).map(([id, region]) => {
                const interactive = step.action === "observe" || step.action === "tap_target";
                const isFocus = step.focus === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-label={region.label}
                    disabled={!interactive}
                    onClick={() => handleStation(id)}
                    className={`absolute rounded-2xl transition ${interactive ? "cursor-pointer hover:bg-white/10 focus-visible:outline-4 focus-visible:outline-amber-300" : "pointer-events-none"} ${isFocus ? "animate-pulse motion-reduce:animate-none" : ""}`}
                    style={{ left: `${region.left}%`, top: `${region.top}%`, width: `${region.width}%`, height: `${region.height}%` }}
                  />
                );
              })}
            </div>

            <Mascot step={step} />

            <div className="absolute inset-x-2 bottom-2 z-40 mx-auto max-w-3xl rounded-[1.4rem] border border-white/60 bg-white/95 p-4 shadow-2xl backdrop-blur sm:bottom-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-700 text-white">
                  <Volume2 className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-700">{step.eyebrow}</p>
                  <p className="mt-1 text-base font-black leading-6 text-slate-900 sm:text-lg">{step.line}</p>
                  {step.helper ? <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 sm:text-sm">{step.helper}</p> : null}

                  {step.action === "choose" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(Object.entries(STATIONS) as Array<[StationId, (typeof STATIONS)[StationId]]>).filter(([id]) => id !== "badges").map(([id, station]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setStationChoice(id)}
                          className={`min-h-10 rounded-xl border-2 px-3 text-sm font-black ${stationChoice === id ? "border-violet-700 bg-violet-700 text-white" : "border-violet-200 bg-violet-50 text-violet-900"}`}
                        >
                          {station.label}
                        </button>
                      ))}
                      {selectedLabel ? <p className="basis-full text-sm font-bold text-emerald-700">I’d visit the {selectedLabel} station because it looks interesting.</p> : null}
                    </div>
                  ) : null}

                  {step.action === "question" ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {["playing football", "painting", "reading"].map((answer) => (
                        <button
                          key={answer}
                          type="button"
                          onClick={() => {
                            if (answer === "painting") {
                              setQuestionCorrect(true);
                              setMessage("Yes—she likes painting!");
                            } else {
                              setMessage("Look at the highlighted person and try again.");
                            }
                          }}
                          className={`min-h-11 rounded-xl border-2 px-3 text-sm font-black ${questionCorrect && answer === "painting" ? "border-emerald-600 bg-emerald-100 text-emerald-900" : "border-violet-200 bg-violet-50 text-violet-900"}`}
                        >
                          {answer}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {step.action === "record" ? (
                    <div className="mt-3 rounded-xl bg-violet-50 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {!voice.recording ? (
                          <button type="button" onClick={() => void voice.start()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-700 px-4 text-sm font-black text-white">
                            <Mic className="h-4 w-4" /> {voice.audioUrl ? "Record again" : "Start recording"}
                          </button>
                        ) : (
                          <button type="button" onClick={voice.stop} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-black text-white">
                            <Square className="h-4 w-4" /> Stop
                          </button>
                        )}
                        {voice.recording ? <span className="text-sm font-black text-rose-700">Listening…</span> : null}
                      </div>
                      {voice.audioUrl ? (
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <audio controls src={voice.audioUrl} className="h-10 max-w-full" aria-label="Play your speaking sample" />
                          <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700"><Check className="h-4 w-4" /> Sample ready</span>
                        </div>
                      ) : null}
                      {voice.error ? <p className="mt-2 text-xs font-bold text-amber-800">{voice.error} You may continue without recording in this pilot.</p> : null}
                      {pilotMode ? (
                        <p className="mt-3 border-t border-violet-200 pt-2 text-[11px] font-semibold text-violet-800">
                          Speech-trigger hook: this turn already owns a short voice clip. Transcription and segment-level clarity feedback will attach here without changing the learner flow.
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {step.action === "reflect" ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {["I felt ready", "I needed thinking time", "I want more practice"].map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setReflection(option)}
                          className={`min-h-11 rounded-xl border-2 px-3 text-sm font-black ${reflection === option ? "border-violet-700 bg-violet-700 text-white" : "border-violet-200 bg-violet-50 text-violet-900"}`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {message ? <p className="mt-2 text-sm font-black text-emerald-700" role="status">{message}</p> : null}

                  {step.action === "complete" ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href={pilotMode ? "/pilots/grade-4-learning-paths" : "/primary/learn/grade-4"} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-700 px-4 text-sm font-black text-white">
                        <Sparkles className="h-4 w-4" /> Back to Unit 1
                      </Link>
                      <button type="button" onClick={reset} className="inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-violet-200 px-4 text-sm font-black text-violet-900">
                        <RotateCcw className="h-4 w-4" /> Play again
                      </button>
                    </div>
                  ) : canContinue ? (
                    <button type="button" onClick={advance} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-700 px-5 text-sm font-black text-white">
                      Continue <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : step.action === "tap_target" || step.action === "observe" ? (
                    <span className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-100 px-3 py-2 text-xs font-black text-amber-900">
                      <Headphones className="h-4 w-4" /> Look at the scene and tap
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

