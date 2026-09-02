"use client";

import Image from "next/image";
import Link from "next/link";
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Flag,
  Heart,
  Lightbulb,
  Mic,
  MousePointer2,
  Pencil,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  ThumbsDown,
  ThumbsUp,
  Volume2,
  VolumeX,
} from "lucide-react";
import { speakText, stopSpeaking, unlockSpeechSynthesis } from "@/lib/audio/tts";
import {
  createAudioMediaRecorder,
  recordedAudioFile,
} from "@/lib/media/recorded-audio";
import {
  SESSION_1_DIALOGUE,
  type Session1DialogueId,
} from "@/lib/curriculum/session-1-dialogue.generated";
import {
  normalizeSession1SpeakingFeedback,
  type Session1SpeakingFeedback,
  type Session1SpeakingPromptId,
} from "@/lib/curriculum/session-1-speaking-feedback";
import type {
  CourseSessionRunRecord,
  Session1HotspotProgress,
} from "@/lib/curriculum/session-run";
import { useGrade4Session1Autosave } from "@/lib/curriculum/use-session-run-autosave";
import styles from "./Grade4Session1Pilot.module.css";

type StationId = "sports" | "art" | "books" | "pets" | "music" | "badges";
type ActivityStationId = Exclude<StationId, "badges">;
type Opinion = "like" | "dont_like";
type Anchor = "close_left" | "close_right" | "lower_left" | "lower_right" | "center_close";
type KeelanPose = "hello" | "listening" | "explaining" | "pointing" | "encouraging";
type StepAction = "continue" | "write_name" | "observe" | "explore" | "choose" | "checkup" | "record" | "reflect" | "complete";

type Station = {
  label: string;
  short: string;
  emoji: string;
  left: number;
  top: number;
  width: number;
  height: number;
  introduction: string;
  audioUrl: string;
};

type StageStep = {
  id: string;
  eyebrow: string;
  line: string;
  helper: string;
  action: StepAction;
  anchor: Anchor;
  facing: "left" | "right" | "front";
  pose: KeelanPose;
  characterScale: number;
  dim: number;
  audioUrl?: string;
};

type PictureCheck = {
  id: string;
  stationId: ActivityStationId;
  prompt: string;
  options: string[];
  answer: string;
  hint: string;
  questionAudioId: Session1DialogueId;
  hintAudioId: Session1DialogueId;
};

const ACTIVITY_STATION_IDS: ActivityStationId[] = ["sports", "art", "books", "pets", "music"];
const DIALOGUE = SESSION_1_DIALOGUE;

const STATIONS: Record<StationId, Station> = {
  sports: { label: "Sports", short: "sports", emoji: "⚽", left: 0.5, top: 29, width: 18, height: 55, introduction: DIALOGUE["s1-station-sports"].text, audioUrl: DIALOGUE["s1-station-sports"].audioUrl },
  art: { label: "Art", short: "painting", emoji: "🎨", left: 17, top: 28, width: 18, height: 48, introduction: DIALOGUE["s1-station-art"].text, audioUrl: DIALOGUE["s1-station-art"].audioUrl },
  books: { label: "Books", short: "reading", emoji: "📚", left: 34, top: 29, width: 22, height: 43, introduction: DIALOGUE["s1-station-books"].text, audioUrl: DIALOGUE["s1-station-books"].audioUrl },
  pets: { label: "Pets", short: "pets", emoji: "🐹", left: 55, top: 29, width: 21, height: 39, introduction: DIALOGUE["s1-station-pets"].text, audioUrl: DIALOGUE["s1-station-pets"].audioUrl },
  music: { label: "Music", short: "music", emoji: "🎵", left: 77, top: 28, width: 22, height: 38, introduction: DIALOGUE["s1-station-music"].text, audioUrl: DIALOGUE["s1-station-music"].audioUrl },
  badges: { label: "Badges", short: "making badges", emoji: "🪪", left: 61, top: 57, width: 38, height: 42, introduction: "At this table, friends make badges to show their names and interests.", audioUrl: DIALOGUE["s1-badge-question"].audioUrl },
};

const STEPS: StageStep[] = [
  { id: "welcome", eyebrow: "Welcome Fair", line: DIALOGUE["s1-welcome"].text, helper: "Tap the big button and we’ll explore together.", action: "continue", anchor: "close_right", facing: "left", pose: "hello", characterScale: 132, dim: 0.48, audioUrl: DIALOGUE["s1-welcome"].audioUrl },
  { id: "badge-mission", eyebrow: "Your explorer badge", line: DIALOGUE["s1-badge-question"].text, helper: "Write it with your finger, stylus, or mouse.", action: "write_name", anchor: "close_left", facing: "right", pose: "pointing", characterScale: 116, dim: 0.5, audioUrl: DIALOGUE["s1-badge-question"].audioUrl },
  { id: "observe", eyebrow: "Look closely", line: DIALOGUE["s1-fair-open"].text, helper: "Tap any glowing place that interests you.", action: "observe", anchor: "lower_right", facing: "left", pose: "listening", characterScale: 70, dim: 0.04, audioUrl: DIALOGUE["s1-fair-open"].audioUrl },
  { id: "explore", eyebrow: "Choose your own path", line: DIALOGUE["s1-explore-mission"].text, helper: "At each station, tell me: I like it or I don’t like it yet.", action: "explore", anchor: "lower_left", facing: "right", pose: "explaining", characterScale: 66, dim: 0.08, audioUrl: DIALOGUE["s1-explore-mission"].audioUrl },
  { id: "choose", eyebrow: "Make it personal", line: DIALOGUE["s1-choose-station"].text, helper: "Choose one, then record your reason.", action: "choose", anchor: "lower_left", facing: "right", pose: "listening", characterScale: 68, dim: 0.17, audioUrl: DIALOGUE["s1-choose-station"].audioUrl },
  { id: "checkup", eyebrow: "Picture power-up", line: DIALOGUE["s1-picture-check-intro"].text, helper: "Look at the highlighted place and choose the clearest sentence.", action: "checkup", anchor: "lower_right", facing: "left", pose: "pointing", characterScale: 62, dim: 0.32, audioUrl: DIALOGUE["s1-picture-check-intro"].audioUrl },
  { id: "record", eyebrow: "Your first speaking sample", line: DIALOGUE["s1-baseline-intro"].text, helper: "Listen back and keep your favourite version.", action: "record", anchor: "lower_left", facing: "right", pose: "listening", characterScale: 60, dim: 0.16, audioUrl: DIALOGUE["s1-baseline-intro"].audioUrl },
  { id: "reflect", eyebrow: "Think about your learning", line: DIALOGUE["s1-reflection"].text, helper: "Pick one honest feeling and one next step.", action: "reflect", anchor: "center_close", facing: "front", pose: "listening", characterScale: 112, dim: 0.5, audioUrl: DIALOGUE["s1-reflection"].audioUrl },
  { id: "complete", eyebrow: "Adventure complete", line: DIALOGUE["s1-complete"].text, helper: "Take your badge into the practice activities or come back and play again.", action: "complete", anchor: "close_right", facing: "left", pose: "encouraging", characterScale: 125, dim: 0.42, audioUrl: DIALOGUE["s1-complete"].audioUrl },
];

const PICTURE_CHECKS: PictureCheck[] = [
  { id: "check-sports", stationId: "sports", prompt: "He likes…", options: ["playing football", "painting", "reading"], answer: "playing football", hint: "Look for the black-and-white ball.", questionAudioId: "s1-picture-question-sports", hintAudioId: "s1-picture-hint-sports" },
  { id: "check-art", stationId: "art", prompt: "She likes…", options: ["playing football", "painting", "reading"], answer: "painting", hint: "Look at the paintbrush and colours.", questionAudioId: "s1-picture-question-art", hintAudioId: "s1-picture-hint-art" },
  { id: "check-books", stationId: "books", prompt: "They enjoy…", options: ["reading", "playing music", "making badges"], answer: "reading", hint: "Look at what they are holding.", questionAudioId: "s1-picture-question-books", hintAudioId: "s1-picture-hint-books" },
  { id: "check-pets", stationId: "pets", prompt: "This child has got…", options: ["a pet picture", "a guitar", "a football"], answer: "a pet picture", hint: "Look near the animal table.", questionAudioId: "s1-picture-question-pets", hintAudioId: "s1-picture-hint-pets" },
  { id: "check-music", stationId: "music", prompt: "They can…", options: ["play music", "read together", "paint a picture"], answer: "play music", hint: "Look at the keyboard and guitar.", questionAudioId: "s1-picture-question-music", hintAudioId: "s1-picture-hint-music" },
];

const KEELAN_POSE_SRC: Record<KeelanPose, string> = {
  hello: "/curriculum/grade-4-movers/characters/poses/keelan-hello-wave.webp",
  listening: "/curriculum/grade-4-movers/characters/poses/keelan-listening.webp",
  explaining: "/curriculum/grade-4-movers/characters/poses/keelan-explaining.webp",
  pointing: "/curriculum/grade-4-movers/characters/poses/keelan-pointing.webp",
  encouraging: "/curriculum/grade-4-movers/characters/poses/keelan-encouraging.webp",
};

const ANCHOR_CLASS: Record<Anchor, string> = {
  close_left: "left-[-6%] top-[1%] h-[73%] w-[58%] md:left-[-3%] md:top-[-7%] md:h-[102%] md:w-[39%]",
  close_right: "right-[-6%] top-[1%] h-[73%] w-[58%] md:right-[-3%] md:top-[-7%] md:h-[102%] md:w-[39%]",
  lower_left: "left-[0] top-[3%] h-[53%] w-[41%] md:top-[6%] md:h-[70%] md:w-[25%]",
  lower_right: "right-[0] top-[3%] h-[53%] w-[41%] md:top-[6%] md:h-[70%] md:w-[25%]",
  center_close: "left-[17%] top-[0] h-[66%] w-[66%] md:left-[33%] md:top-[-5%] md:h-[94%] md:w-[34%]",
};

function choosePictureChecks() {
  return [...PICTURE_CHECKS]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map((item) => item.id);
}

function useSessionSounds(enabled: boolean) {
  const contextRef = useRef<AudioContext | null>(null);
  return useCallback((kind: "tap" | "correct" | "retry" | "launch") => {
    if (!enabled || typeof window === "undefined" || typeof AudioContext === "undefined") return;
    const context = contextRef.current ?? new AudioContext();
    contextRef.current = context;
    const now = context.currentTime;
    const notes = kind === "correct" ? [523, 659, 784] : kind === "launch" ? [294, 440, 587] : kind === "retry" ? [220, 196] : [440];
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = kind === "retry" ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + index * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.1, now + index * 0.08 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 0.16);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now + index * 0.08);
      oscillator.stop(now + index * 0.08 + 0.18);
    });
  }, [enabled]);
}

function useVoiceRecorder(maxSeconds: number, onComplete?: () => void, onError?: () => void) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [microphoneReady, setMicrophoneReady] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const restoreId = window.setTimeout(() => {
      setMicrophoneReady(window.localStorage.getItem("wke-microphone-ready") === "yes");
    }, 0);
    return () => {
      window.clearTimeout(restoreId);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (timerRef.current != null) window.clearInterval(timerRef.current);
    };
  }, []);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const clear = useCallback(() => {
    setAudioUrl((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      return null;
    });
    setAudioFile(null);
    setDurationSeconds(0);
    setError(null);
  }, []);

  const start = useCallback(async () => {
    clear();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Voice recording is not available on this device.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      window.localStorage.setItem("wke-microphone-ready", "yes");
      setMicrophoneReady(true);
      const recorder = createAudioMediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const file = recordedAudioFile(
          chunksRef.current,
          recorder.mimeType,
          "session-1-speaking",
        );
        setAudioFile(file);
        setAudioUrl(URL.createObjectURL(file));
        setRecording(false);
        setDurationSeconds(Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)));
        stream.getTracks().forEach((track) => track.stop());
        if (timerRef.current != null) window.clearInterval(timerRef.current);
        onComplete?.();
      };
      startedAtRef.current = Date.now();
      setRecording(true);
      recorder.start(250);
      timerRef.current = window.setInterval(() => {
        const elapsed = Math.round((Date.now() - startedAtRef.current) / 1000);
        setDurationSeconds(Math.min(maxSeconds, elapsed));
        if (elapsed >= maxSeconds) stop();
      }, 250);
    } catch {
      setError("Microphone access was blocked. Allow it in the browser, then try again.");
      onError?.();
    }
  }, [clear, maxSeconds, onComplete, onError, stop]);

  return { recording, audioUrl, audioFile, error, durationSeconds, microphoneReady, start, stop, clear };
}

function Mascot({ step, talking = false }: { step: StageStep; talking?: boolean }) {
  const faceTransform = step.facing === "left" ? "scaleX(-1)" : "scaleX(1)";
  return (
    <div className={`pointer-events-none absolute z-30 transition-all duration-700 ease-out motion-reduce:duration-150 ${ANCHOR_CLASS[step.anchor]}`} style={{ transform: faceTransform }} aria-hidden>
      <div className={`relative h-full w-full ${talking ? styles.keelanTalk : styles.keelanIdle}`} style={{ transform: `scale(${step.characterScale / 125})`, transformOrigin: "bottom center" }}>
        <Image src={KEELAN_POSE_SRC[step.pose]} alt="" fill priority className="object-contain object-bottom drop-shadow-[0_18px_18px_rgba(15,10,35,0.42)]" unoptimized />
      </div>
    </div>
  );
}

function HandwritingBadge({ initialPreview, onChange }: { initialPreview: string | null; onChange: (hasInk: boolean, preview: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [hasInk, setHasInk] = useState(Boolean(initialPreview));

  useEffect(() => {
    if (!initialPreview || !canvasRef.current) return;
    const image = new window.Image();
    image.onload = () => canvasRef.current?.getContext("2d")?.drawImage(image, 0, 0, 720, 208);
    image.src = initialPreview;
  }, [initialPreview]);

  function point(event: ReactPointerEvent<HTMLCanvasElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: ((event.clientX - bounds.left) / bounds.width) * 720, y: ((event.clientY - bounds.top) / bounds.height) * 208 };
  }

  function begin(event: ReactPointerEvent<HTMLCanvasElement>) {
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const next = point(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    context.strokeStyle = "#312e81";
    context.fillStyle = "#312e81";
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 8;
    context.beginPath();
    context.arc(next.x, next.y, 4, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.moveTo(next.x, next.y);
    setHasInk(true);
  }

  function move(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const next = point(event);
    context.lineTo(next.x, next.y);
    context.stroke();
  }

  function finish(event: ReactPointerEvent<HTMLCanvasElement>) {
    drawingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    onChange(true, event.currentTarget.toDataURL("image/webp", 0.55));
  }

  function clear() {
    canvasRef.current?.getContext("2d")?.clearRect(0, 0, 720, 208);
    setHasInk(false);
    onChange(false, null);
  }

  return (
    <div className="mt-3 max-w-2xl rounded-[1.35rem] border-4 border-violet-700 bg-amber-50 p-2 shadow-inner">
      <div className="rounded-xl bg-violet-700 px-4 py-1.5 text-center text-white"><p className="text-lg font-black uppercase tracking-[.18em]">Hello!</p><p className="text-xs font-bold">My name is</p></div>
      <div className="relative mt-2 overflow-hidden rounded-xl border-2 border-dashed border-violet-300 bg-white">
        <canvas ref={canvasRef} width={720} height={208} onPointerDown={begin} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} className="h-20 w-full cursor-crosshair touch-none sm:h-24" aria-label="Write your name on the badge" />
        {!hasInk ? <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><span className="flex items-center gap-2 rounded-full bg-amber-100 px-5 py-2 font-black text-violet-800 ring-4 ring-amber-300/70"><Pencil className="h-7 w-7 -rotate-12 animate-bounce motion-reduce:animate-none" /> Write here</span></div> : null}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 px-1"><p className="text-xs font-bold text-violet-900">Write it your way—neatness doesn’t matter.</p><button type="button" onClick={clear} className="inline-flex min-h-10 items-center gap-1 rounded-xl border-2 border-violet-200 bg-white px-3 text-xs font-black text-violet-800"><RotateCcw className="h-4 w-4" /> Clear</button></div>
    </div>
  );
}

function IntroGate({ opening, returning, onStart }: { opening: boolean; returning: boolean; onStart: () => void }) {
  return (
    <div className={`absolute inset-0 z-[80] overflow-hidden ${opening ? "pointer-events-none" : ""}`} aria-hidden={opening}>
      <div className={`absolute -inset-[45%] opacity-70 ${styles.spiral} ${opening ? styles.spiralOpening : ""}`} />
      <div className={`absolute inset-y-0 left-0 w-1/2 ${styles.curtainLeft} ${opening ? styles.curtainLeftOpen : ""}`} />
      <div className={`absolute inset-y-0 right-0 w-1/2 ${styles.curtainRight} ${opening ? styles.curtainRightOpen : ""}`} />
      <div className={`absolute inset-0 flex flex-col items-center justify-center p-6 text-center transition-opacity duration-300 ${opening ? "opacity-0" : "opacity-100"}`}>
        <div className="relative h-[48vh] min-h-64 w-[min(82vw,32rem)]">
          <Image src={KEELAN_POSE_SRC.hello} alt="Keelan waves hello" fill priority className={`object-contain object-bottom drop-shadow-[0_22px_25px_rgba(15,10,35,.55)] ${styles.keelanIdle}`} unoptimized />
          <Sparkles className={`absolute right-[10%] top-[12%] h-12 w-12 text-yellow-300 ${styles.sparkle}`} />
        </div>
        <p className="-mt-3 text-sm font-black uppercase tracking-[.22em] text-yellow-200">Welcome Fair adventure</p>
        <h1 className="mt-2 text-3xl font-black text-white drop-shadow-lg sm:text-5xl">Ready to meet Keelan?</h1>
        <button type="button" onClick={onStart} className={`mt-6 inline-flex min-h-20 min-w-64 items-center justify-center gap-4 rounded-[1.6rem] border-4 border-white bg-yellow-300 px-9 text-2xl font-black text-violet-950 shadow-2xl transition hover:scale-105 active:scale-95 ${styles.playPulse}`}>
          <Play className="h-9 w-9 fill-violet-950" /> {returning ? "Resume adventure" : "Start adventure"}
        </button>
      </div>
    </div>
  );
}

type RecorderState = ReturnType<typeof useVoiceRecorder>;

function feedbackVoiceId(feedback: Session1SpeakingFeedback): Session1DialogueId {
  if (feedback.status === "try_again") return "s1-feedback-could-not-hear";
  const missingIds = feedback.heardParts.filter((part) => !part.heard).map((part) => part.id);
  if (feedback.promptId === "station-choice") {
    if (missingIds.includes("station")) return "s1-choice-feedback-station-unclear";
    if (missingIds.includes("reason")) return "s1-choice-feedback-missing-reason";
    if (feedback.clarityCues.length > 0) return "s1-feedback-word-unclear";
    return "s1-choice-feedback-clear";
  }
  if (missingIds.length > 1) return "s1-baseline-feedback-several";
  if (missingIds.includes("name")) return "s1-baseline-feedback-name";
  if (missingIds.includes("age")) return "s1-baseline-feedback-age";
  if (missingIds.includes("interest")) return "s1-baseline-feedback-like";
  if (feedback.clarityCues.length > 0) return "s1-feedback-word-unclear";
  return "s1-baseline-feedback-clear";
}

function HighlightedTranscript({
  text,
  cues,
}: {
  text: string;
  cues: Session1SpeakingFeedback["clarityCues"];
}) {
  const lower = text.toLowerCase();
  const ranges: Array<{ start: number; end: number }> = [];
  for (const cue of cues) {
    const needle = cue.text.trim().toLowerCase();
    if (!needle) continue;
    let cursor = 0;
    while (cursor < lower.length) {
      const start = lower.indexOf(needle, cursor);
      if (start < 0) break;
      ranges.push({ start, end: start + needle.length });
      cursor = start + needle.length;
    }
  }
  const ordered = ranges
    .sort((a, b) => a.start - b.start || b.end - a.end)
    .filter((range, index, items) => index === 0 || range.start >= items[index - 1].end);
  if (ordered.length === 0) return <>{text}</>;

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  ordered.forEach((range, index) => {
    if (range.start > cursor) parts.push(text.slice(cursor, range.start));
    parts.push(
      <mark key={index} className="rounded bg-yellow-300 px-0.5 text-fuchsia-950 ring-2 ring-yellow-400">
        {text.slice(range.start, range.end)}
      </mark>,
    );
    cursor = range.end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}

function VoiceControls({
  recorder,
  buttonLabel,
  promptId,
  stationId,
  feedback,
  onFeedback,
  onRecordingStart,
  onFeedbackUnavailable,
  onSkip,
}: {
  recorder: RecorderState;
  buttonLabel: string;
  promptId: Session1SpeakingPromptId;
  stationId?: ActivityStationId | null;
  feedback: Session1SpeakingFeedback | null;
  onFeedback: (feedback: Session1SpeakingFeedback) => void;
  onRecordingStart: () => void;
  onFeedbackUnavailable: () => void;
  onSkip: () => void;
}) {
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  async function checkSpeaking() {
    if (!recorder.audioFile || checking) return;
    setChecking(true);
    setCheckError(null);
    const formData = new FormData();
    formData.set("audio", recorder.audioFile, recorder.audioFile.name);
    formData.set("promptId", promptId);
    if (stationId) formData.set("stationId", stationId);
    try {
      const response = await fetch("/api/primary/session-1/transcribe", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json().catch(() => null) as
        | { feedback?: unknown; error?: unknown }
        | null;
      if (!response.ok) {
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Keelan could not check that recording just now.",
        );
      }
      const normalized = normalizeSession1SpeakingFeedback(payload?.feedback);
      if (!normalized) throw new Error("Keelan could not read the speaking feedback.");
      onFeedback(normalized);
    } catch (error) {
      setCheckError(
        error instanceof Error
          ? error.message
          : "Keelan’s listening gadget is resting. You can keep going.",
      );
      onFeedbackUnavailable();
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="mt-3 rounded-2xl border-2 border-violet-200 bg-violet-50 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-3">
        {!recorder.recording ? (
          <button type="button" onClick={() => { onRecordingStart(); setCheckError(null); void recorder.start(); }} disabled={checking} className="inline-flex min-h-14 items-center gap-3 rounded-2xl bg-rose-600 px-6 text-base font-black text-white shadow-lg ring-4 ring-rose-200 transition hover:scale-[1.03] active:scale-95 disabled:opacity-50">
            <Mic className="h-6 w-6" /> {recorder.audioUrl ? "Record again" : buttonLabel}
          </button>
        ) : (
          <button type="button" onClick={recorder.stop} className="inline-flex min-h-14 items-center gap-3 rounded-2xl bg-rose-600 px-6 text-base font-black text-white shadow-lg ring-4 ring-rose-200">
            <Square className="h-6 w-6" /> Stop recording
          </button>
        )}
        <span className={`rounded-full px-3 py-2 text-xs font-black ${recorder.recording ? "bg-rose-100 text-rose-800" : recorder.microphoneReady ? "bg-emerald-100 text-emerald-800" : "bg-white text-slate-600"}`}>
          {recorder.recording ? `Listening · ${recorder.durationSeconds}s` : recorder.microphoneReady ? "Microphone ready" : "Tap once to allow microphone"}
        </span>
      </div>
      {recorder.audioUrl ? <div className="mt-3 flex flex-wrap items-center gap-3"><audio controls src={recorder.audioUrl} className="h-11 max-w-full" aria-label="Play your recorded answer" /><span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700"><Check className="h-4 w-4" /> Answer ready · {recorder.durationSeconds}s</span></div> : null}
      {recorder.audioFile && !feedback ? (
        <div className="mt-4 rounded-2xl border-2 border-fuchsia-200 bg-white p-3">
          <button type="button" onClick={() => void checkSpeaking()} disabled={checking} className={"inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-violet-700 to-fuchsia-600 px-6 text-lg font-black text-white shadow-lg transition hover:scale-[1.01] active:scale-95 disabled:opacity-70 " + styles.playPulse}>
            <Sparkles className={"h-6 w-6 " + (checking ? "animate-spin" : "")} />
            {checking ? "Keelan is listening…" : "Check my speaking"}
          </button>
          <p className="mt-2 text-center text-[11px] font-bold leading-4 text-slate-500">
            This recording is sent to OpenAI for this check. WKE does not save the audio.
          </p>
        </div>
      ) : null}
      {feedback ? (
        <div className={"mt-4 rounded-2xl border-3 p-4 " + (feedback.status === "clear" ? "border-emerald-300 bg-emerald-50" : feedback.status === "try_again" ? "border-amber-300 bg-amber-50" : "border-sky-300 bg-sky-50")} role="status">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-2xl shadow-sm" aria-hidden>{feedback.status === "clear" ? "✨" : "💬"}</span>
            <div>
              <p className="text-lg font-black text-violet-950">{feedback.title}</p>
              <p className="mt-1 font-bold text-slate-700">{feedback.message}</p>
            </div>
          </div>
          <div className="mt-3 rounded-xl bg-white/90 p-3">
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-violet-700">Keelan heard</p>
            <p className="mt-1 text-base font-black text-slate-900">“<HighlightedTranscript text={feedback.transcript} cues={feedback.clarityCues} />”</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {feedback.heardParts.map((part) => (
              <span key={part.id} className={"inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-black " + (part.heard ? "bg-emerald-600 text-white" : "bg-white text-violet-800 ring-2 ring-violet-200")}>
                {part.heard ? <Check className="h-4 w-4" /> : <Lightbulb className="h-4 w-4" />}
                {part.label}
              </span>
            ))}
          </div>
          {feedback.clarityCues.length > 0 ? (
            <div className="mt-3 rounded-xl bg-yellow-200 p-3 text-sm font-black text-yellow-950">
              Try the glowing {feedback.clarityCues.length === 1 ? "part" : "parts"} once more:
              <span className="ml-2 inline-flex flex-wrap gap-2">
                {feedback.clarityCues.map((cue) => <mark key={cue.text} className="rounded-lg bg-white px-2 py-1 text-fuchsia-800">{cue.text}</mark>)}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
      {recorder.error ? <div className="mt-3 rounded-xl bg-amber-100 p-3 text-sm font-bold text-amber-900"><p>{recorder.error}</p><button type="button" onClick={onSkip} className="mt-2 min-h-10 rounded-xl border-2 border-amber-500 bg-white px-4 font-black">Keep going</button></div> : null}
      {checkError ? <div className="mt-3 rounded-xl bg-amber-100 p-3 text-sm font-bold text-amber-900"><p>{checkError}</p><button type="button" onClick={onSkip} className="mt-2 min-h-10 rounded-xl border-2 border-amber-500 bg-white px-4 font-black">Keep going without feedback</button></div> : null}
    </div>
  );
}

function WearableBadge({ preview }: { preview: string | null }) {
  if (!preview) return null;
  return (
    <div className={`absolute right-3 top-3 z-50 w-28 -rotate-2 rounded-xl border-4 border-violet-700 bg-amber-50 p-1 shadow-2xl sm:right-5 sm:top-5 sm:w-36 ${styles.rewardPop}`} aria-label="Your explorer badge">
      <div className="rounded-lg bg-violet-700 py-1 text-center text-[9px] font-black uppercase tracking-[.16em] text-white">Hello!</div>
      <Image src={preview} alt="Your handwritten name badge" width={720} height={208} unoptimized className="mt-1 h-8 w-full rounded-md bg-white object-cover sm:h-10" />
      <div className="absolute -bottom-3 left-1/2 h-4 w-12 -translate-x-1/2 rounded-b-full bg-violet-800/80" />
    </div>
  );
}

export function Grade4Session1PilotV2({ pilotMode = false, initialRun = null }: { pilotMode?: boolean; initialRun?: CourseSessionRunRecord | null }) {
  const restored = initialRun?.state.hotspot;
  const restoredStepId = ["sports", "art", "books", "pets", "music"].includes(restored?.activeStepId ?? "") ? "explore" : restored?.activeStepId;
  const [stepIndex, setStepIndex] = useState(() => Math.max(0, STEPS.findIndex((item) => item.id === restoredStepId)));
  const [entryState, setEntryState] = useState<"waiting" | "opening" | "ready">("waiting");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [talking, setTalking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [badgeHasInk, setBadgeHasInk] = useState(restored?.badgeComplete ?? false);
  const [badgePreview, setBadgePreview] = useState<string | null>(restored?.badgePreview ?? null);
  const [stationChoice, setStationChoice] = useState<ActivityStationId | null>(restored?.stationChoice && ACTIVITY_STATION_IDS.includes(restored.stationChoice as ActivityStationId) ? restored.stationChoice as ActivityStationId : null);
  const [stationOpinions, setStationOpinions] = useState<Record<string, Opinion>>(restored?.stationOpinions ?? {});
  const [introducedStationIds, setIntroducedStationIds] = useState<string[]>(restored?.introducedStationIds ?? []);
  const [activeStation, setActiveStation] = useState<ActivityStationId | null>(null);
  const [pictureCheckItemIds, setPictureCheckItemIds] = useState<string[]>(restored?.pictureCheckItemIds ?? []);
  const [pictureCheckCorrectIds, setPictureCheckCorrectIds] = useState<string[]>(restored?.pictureCheckCorrectIds ?? []);
  const [reflection, setReflection] = useState<string | null>(restored?.reflection ?? null);
  const [nextStepGoal, setNextStepGoal] = useState<string | null>(restored?.nextStepGoal ?? null);
  const [completedVoiceParts, setCompletedVoiceParts] = useState<string[]>(restored?.completedVoiceParts ?? []);
  const [speakingFeedback, setSpeakingFeedback] = useState<
    Partial<Record<Session1SpeakingPromptId, Session1SpeakingFeedback>>
  >({});
  const [wrongCheck, setWrongCheck] = useState(false);
  const step = STEPS[stepIndex] ?? STEPS[0];
  const playEffect = useSessionSounds(soundEnabled);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const talkingTimerRef = useRef<number | null>(null);
  const lastAutoNarrationRef = useRef("");
  const selectedChecks = useMemo(() => pictureCheckItemIds.map((id) => PICTURE_CHECKS.find((item) => item.id === id)).filter((item): item is PictureCheck => Boolean(item)), [pictureCheckItemIds]);
  const currentCheck = selectedChecks.find((item) => !pictureCheckCorrectIds.includes(item.id)) ?? null;

  useEffect(() => {
    const restoreId = window.setTimeout(() => {
      const muted = window.localStorage.getItem("wke-learning-audio-muted") === "yes";
      setSoundEnabled(!muted);
    }, 0);
    return () => window.clearTimeout(restoreId);
  }, []);

  useEffect(() => {
    if (pictureCheckItemIds.length === 3) return;
    const chooseId = window.setTimeout(() => setPictureCheckItemIds(choosePictureChecks()), 0);
    return () => window.clearTimeout(chooseId);
  }, [pictureCheckItemIds.length]);

  const stopLine = useCallback(() => {
    if (talkingTimerRef.current != null) window.clearTimeout(talkingTimerRef.current);
    talkingTimerRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    stopSpeaking();
    setTalking(false);
  }, []);

  const playLine = useCallback((text: string, audioUrl?: string, onEnded?: () => void) => {
    stopLine();
    if (!soundEnabled) {
      onEnded?.();
      return;
    }
    setTalking(true);
    const finish = () => {
      audioRef.current = null;
      setTalking(false);
      onEnded?.();
    };
    const browserVoiceFallback = () => {
      speakText(text, { lang: "en-GB", rate: 0.88 });
      talkingTimerRef.current = window.setTimeout(finish, Math.min(4500, Math.max(1300, text.length * 55)));
    };
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      let fallbackStarted = false;
      const fallbackOnce = () => {
        if (fallbackStarted) return;
        fallbackStarted = true;
        audioRef.current = null;
        browserVoiceFallback();
      };
      audioRef.current = audio;
      audio.onended = finish;
      audio.onerror = fallbackOnce;
      void audio.play().catch(fallbackOnce);
      return;
    }
    browserVoiceFallback();
  }, [soundEnabled, stopLine]);

  const playDialogue = useCallback((id: Session1DialogueId, onEnded?: () => void) => {
    const clip = DIALOGUE[id];
    playLine(clip.text, clip.audioUrl, onEnded);
  }, [playLine]);

  const markChoiceVoiceComplete = useCallback(() => {
    playEffect("correct");
    playDialogue("s1-recording-ready", () => playDialogue("s1-check-speaking-invite"));
  }, [playDialogue, playEffect]);
  const markBaselineVoiceComplete = useCallback(() => {
    playEffect("correct");
    playDialogue("s1-recording-ready", () => playDialogue("s1-check-speaking-invite"));
  }, [playDialogue, playEffect]);
  const handleMicrophoneError = useCallback(() => {
    playDialogue("s1-microphone-help");
  }, [playDialogue]);
  const choiceVoice = useVoiceRecorder(15, markChoiceVoiceComplete, handleMicrophoneError);
  const baselineVoice = useVoiceRecorder(20, markBaselineVoiceComplete, handleMicrophoneError);

  useEffect(() => {
    if (entryState !== "ready") return;
    const narrationKey = step.action === "explore" ? `${step.id}:${activeStation ?? "intro"}` : step.id;
    if (lastAutoNarrationRef.current === narrationKey) return;
    lastAutoNarrationRef.current = narrationKey;
    const station = activeStation && step.action === "explore" ? STATIONS[activeStation] : null;
    const playId = window.setTimeout(() => {
      if (station) {
        playLine(station.introduction, station.audioUrl);
      } else if (step.action === "checkup" && currentCheck) {
        playLine(step.line, step.audioUrl, () => playDialogue(currentCheck.questionAudioId));
      } else if (step.action === "complete") {
        playLine(step.line, step.audioUrl, () => playDialogue("s1-practice-invite"));
      } else {
        playLine(step.line, step.audioUrl);
      }
    }, 0);
    return () => window.clearTimeout(playId);
  }, [activeStation, currentCheck, entryState, playDialogue, playLine, step.action, step.audioUrl, step.id, step.line]);

  useEffect(() => () => stopLine(), [stopLine]);

  const exploredCount = ACTIVITY_STATION_IDS.filter((id) => introducedStationIds.includes(id) && stationOpinions[id]).length;
  const pictureCheckComplete = selectedChecks.length === 3 && selectedChecks.every((item) => pictureCheckCorrectIds.includes(item.id));
  const choiceComplete = completedVoiceParts.includes("station-choice");
  const baselineComplete = completedVoiceParts.includes("baseline");

  const canContinue = useMemo(() => {
    if (step.action === "write_name") return badgeHasInk;
    if (step.action === "explore") return exploredCount === ACTIVITY_STATION_IDS.length;
    if (step.action === "choose") return Boolean(stationChoice && choiceComplete);
    if (step.action === "checkup") return pictureCheckComplete;
    if (step.action === "record") return baselineComplete;
    if (step.action === "reflect") return Boolean(reflection && nextStepGoal);
    return step.action === "continue";
  }, [badgeHasInk, baselineComplete, choiceComplete, exploredCount, nextStepGoal, pictureCheckComplete, reflection, stationChoice, step.action]);

  const focusStationId: StationId | null = step.action === "explore" ? activeStation : step.action === "checkup" ? currentCheck?.stationId ?? null : null;
  const focusRegion = focusStationId ? STATIONS[focusStationId] : null;
  const progress = Math.round(((stepIndex + 1) / STEPS.length) * 100);

  const hotspotProgress = useMemo<Session1HotspotProgress>(() => ({
    activeStepId: step.id,
    badgeComplete: badgeHasInk,
    badgePreview,
    stationChoice,
    stationOpinions,
    introducedStationIds,
    pictureCheckItemIds,
    pictureCheckCorrectIds,
    questionCorrect: pictureCheckComplete,
    reflection,
    nextStepGoal,
    completedVoiceParts,
  }), [badgeHasInk, badgePreview, completedVoiceParts, introducedStationIds, nextStepGoal, pictureCheckComplete, pictureCheckCorrectIds, pictureCheckItemIds, reflection, stationChoice, stationOpinions, step.id]);

  const saveState = useGrade4Session1Autosave({ enabled: !pilotMode, phase: "hotspot", status: "in_progress", activeStepId: step.id, progress: hotspotProgress });

  function enterLesson() {
    unlockSpeechSynthesis();
    playEffect("launch");
    setEntryState("opening");
    window.setTimeout(() => setEntryState("ready"), 850);
  }

  function advance() {
    const finishAdvance = () => {
      stopLine();
      playEffect("tap");
      setMessage(null);
      setActiveStation(null);
      setWrongCheck(false);
      setStepIndex((current) => Math.min(STEPS.length - 1, current + 1));
    };
    if (step.action === "write_name") {
      playDialogue("s1-badge-ready", finishAdvance);
      return;
    }
    finishAdvance();
  }

  function reset() {
    stopLine();
    lastAutoNarrationRef.current = "";
    choiceVoice.clear();
    baselineVoice.clear();
    setStepIndex(0);
    setEntryState("waiting");
    setMessage(null);
    setBadgeHasInk(false);
    setBadgePreview(null);
    setStationChoice(null);
    setStationOpinions({});
    setIntroducedStationIds([]);
    setActiveStation(null);
    setPictureCheckItemIds(choosePictureChecks());
    setPictureCheckCorrectIds([]);
    setReflection(null);
    setNextStepGoal(null);
    setCompletedVoiceParts([]);
    setSpeakingFeedback({});
  }

  function completeSpeakingPart(promptId: Session1SpeakingPromptId) {
    setCompletedVoiceParts((current) => current.includes(promptId) ? current : [...current, promptId]);
  }

  function clearSpeakingPart(promptId: Session1SpeakingPromptId) {
    setSpeakingFeedback((current) => {
      const next = { ...current };
      delete next[promptId];
      return next;
    });
    setCompletedVoiceParts((current) => current.filter((part) => part !== promptId));
  }

  function acceptSpeakingFeedback(feedback: Session1SpeakingFeedback) {
    setSpeakingFeedback((current) => ({ ...current, [feedback.promptId]: feedback }));
    completeSpeakingPart(feedback.promptId);
    playEffect(feedback.status === "try_again" ? "retry" : "correct");
    playDialogue(feedbackVoiceId(feedback));
  }

  function visitStation(id: ActivityStationId) {
    playEffect("tap");
    setActiveStation(id);
    setIntroducedStationIds((current) => current.includes(id) ? current : [...current, id]);
    setMessage(null);
  }

  function setOpinion(id: ActivityStationId, opinion: Opinion) {
    playEffect("correct");
    const nextOpinions = { ...stationOpinions, [id]: opinion };
    setStationOpinions(nextOpinions);
    setMessage(opinion === "like" ? `You like ${STATIONS[id].short}!` : `That’s okay—${STATIONS[id].short} is not your choice today.`);
    const allComplete = ACTIVITY_STATION_IDS.every((stationId) => nextOpinions[stationId]);
    if (allComplete) {
      playDialogue("s1-all-stations-complete");
      return;
    }
    const answeredCount = Object.keys(nextOpinions).length;
    const reactionId = opinion === "like"
      ? answeredCount % 2 === 0 ? "s1-opinion-like-b" : "s1-opinion-like-a"
      : answeredCount % 2 === 0 ? "s1-opinion-not-for-me-b" : "s1-opinion-not-for-me-a";
    playDialogue(reactionId);
  }

  function answerCheck(answer: string) {
    if (!currentCheck) return;
    if (answer === currentCheck.answer) {
      playEffect("correct");
      const nextCorrectIds = pictureCheckCorrectIds.includes(currentCheck.id) ? pictureCheckCorrectIds : [...pictureCheckCorrectIds, currentCheck.id];
      const nextCheck = selectedChecks.find((item) => !nextCorrectIds.includes(item.id)) ?? null;
      const reactionIds = ["s1-picture-correct-a", "s1-picture-correct-b", "s1-picture-correct-c"] as const;
      const reactionId = reactionIds[Math.min(nextCorrectIds.length - 1, reactionIds.length - 1)];
      setPictureCheckCorrectIds(nextCorrectIds);
      setWrongCheck(false);
      setMessage("Picture power! You found it.");
      playDialogue(reactionId, () => {
        if (nextCheck) playDialogue(nextCheck.questionAudioId);
        else playDialogue("s1-picture-check-complete");
      });
    } else {
      playEffect("retry");
      setWrongCheck(true);
      setMessage("Good try. Use the picture clue and look again.");
      playDialogue(currentCheck.hintAudioId);
    }
  }

  return (
    <main className="min-h-dvh bg-[#171229] p-2 text-slate-900 lg:h-dvh lg:overflow-hidden lg:p-3">
      <div className="mx-auto flex min-h-[44rem] w-full max-w-[100rem] flex-col gap-2 lg:h-full lg:min-h-0">
        <header className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/95 px-3 py-2 shadow-xl sm:px-4">
          <Link href={pilotMode ? "/pilots/grade-4-learning-paths" : "/primary/learn/grade-4"} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-800" aria-label="Back to Grade 4 learning paths"><ArrowLeft className="h-6 w-6" /></Link>
          <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-black uppercase tracking-[.16em] text-violet-700">Unit 1 · Session 1</p><h1 className="truncate text-base font-black sm:text-xl">Enter the Welcome Fair</h1></div>
          <button type="button" onClick={() => { const next = !soundEnabled; setSoundEnabled(next); window.localStorage.setItem("wke-learning-audio-muted", next ? "no" : "yes"); if (!next) stopLine(); else { unlockSpeechSynthesis(); playEffect("tap"); } }} className="flex h-11 min-w-11 items-center justify-center gap-2 rounded-xl border-2 border-violet-200 bg-white px-3 text-xs font-black text-violet-900" aria-label={soundEnabled ? "Mute lesson sounds" : "Turn on lesson sounds"}>{soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}<span className="hidden sm:inline">{soundEnabled ? "Sound on" : "Sound off"}</span></button>
          {!pilotMode ? <span className={`hidden rounded-full px-3 py-2 text-xs font-black md:inline ${saveState.status === "error" ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"}`}>{saveState.status === "saving" ? "Saving…" : saveState.status === "error" ? "Save paused" : "Saved"}</span> : null}
          <button type="button" onClick={() => { if (window.confirm("Start Session 1 again? Your current Session 1 progress will be cleared.")) reset(); }} className="flex h-11 min-w-11 items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-3 text-xs font-black text-slate-600"><RotateCcw className="h-5 w-5" /><span className="hidden sm:inline">Restart</span></button>
          <div className="basis-full"><div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 transition-all duration-500" style={{ width: `${progress}%` }} /></div></div>
        </header>

        <section className={`relative flex-1 overflow-hidden rounded-[1.5rem] border-4 border-white/80 bg-slate-900 shadow-2xl lg:min-h-0 ${entryState === "ready" ? styles.stageEnter : ""}`}>
          <div className="relative h-full min-h-[38rem] w-full overflow-hidden lg:min-h-0">
            <Image src="/curriculum/grade-4-movers/unit-1/welcome-fair.png" alt="A busy school Welcome Fair with sports, art, books, pets, music, and badge-making stations" fill priority className="object-cover" unoptimized />

            {focusRegion ? (
              <div className="pointer-events-none absolute z-10 rounded-2xl border-4 border-yellow-300 transition-all duration-300 motion-reduce:duration-0" style={{ left: `${focusRegion.left}%`, top: `${focusRegion.top}%`, width: `${focusRegion.width}%`, height: `${focusRegion.height}%`, boxShadow: `0 0 0 9999px rgba(12,9,28,${step.dim})` }}>
                <span className="absolute -top-4 left-2 rounded-full bg-yellow-300 px-4 py-2 text-sm font-black text-violet-950 shadow-lg">{focusRegion.emoji} {focusRegion.label}</span>
              </div>
            ) : step.dim > 0 ? <div className="pointer-events-none absolute inset-0 z-10 bg-[#0c091c] transition-opacity duration-300" style={{ opacity: step.dim }} /> : null}

            <div className="absolute inset-0 z-20">
              {ACTIVITY_STATION_IDS.map((id) => {
                const station = STATIONS[id];
                const interactive = step.action === "observe" || step.action === "explore";
                const visited = introducedStationIds.includes(id);
                return (
                  <button key={id} type="button" disabled={!interactive} aria-label={`${station.label} station${visited ? ", visited" : ""}`} onClick={() => { visitStation(id); if (step.action === "observe") window.setTimeout(advance, 650); }} className={`absolute rounded-2xl transition ${interactive ? "cursor-pointer hover:bg-white/15 focus-visible:outline-4 focus-visible:outline-yellow-300" : "pointer-events-none"}`} style={{ left: `${station.left}%`, top: `${station.top}%`, width: `${station.width}%`, height: `${station.height}%` }}>
                    {interactive ? <span className="pointer-events-none absolute inset-0 flex items-center justify-center"><span className={`relative flex h-14 w-14 items-center justify-center rounded-full border-4 border-white text-2xl shadow-[0_8px_24px_rgba(0,0,0,.42)] sm:h-16 sm:w-16 ${stationOpinions[id] ? "bg-emerald-400" : activeStation === id ? "bg-yellow-300" : "bg-violet-600 text-white"}`}><span className="absolute inset-[-.45rem] animate-ping rounded-full border-4 border-yellow-300/70 motion-reduce:animate-none" />{stationOpinions[id] ? <Check className="h-8 w-8 text-emerald-950" /> : station.emoji}</span></span> : null}
                  </button>
                );
              })}
            </div>

            <Mascot step={step} talking={talking} />
            <WearableBadge preview={badgePreview} />

            <div className="absolute inset-x-2 bottom-2 z-40 mx-auto max-h-[58%] max-w-5xl overflow-y-auto rounded-[1.4rem] border border-white/70 bg-white/96 p-3 shadow-2xl backdrop-blur sm:bottom-3 sm:p-5 lg:max-h-[52%]">
              <div className="flex items-start gap-3">
                <button type="button" onClick={() => {
                  if (activeStation && step.action === "explore") {
                    const station = STATIONS[activeStation];
                    playLine(station.introduction, station.audioUrl);
                  } else if (step.action === "checkup" && currentCheck) {
                    playDialogue(currentCheck.questionAudioId);
                  } else {
                    playLine(step.line, step.audioUrl);
                  }
                }} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-700 text-white shadow-lg transition hover:scale-105 active:scale-95" aria-label="Play Keelan's line"><Volume2 className="h-6 w-6" /></button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] font-black uppercase tracking-[.17em] text-violet-700">{step.eyebrow}</p>{step.action === "explore" ? <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-800">{exploredCount}/5 explored</span> : step.action === "checkup" ? <span className="rounded-full bg-yellow-200 px-3 py-1 text-xs font-black text-yellow-950">{pictureCheckCorrectIds.filter((id) => pictureCheckItemIds.includes(id)).length}/3 power-ups</span> : null}</div>
                  <p className="mt-1 text-xl font-black leading-7 text-slate-950 sm:text-3xl sm:leading-9">{activeStation && step.action === "explore" ? STATIONS[activeStation].introduction : step.line}</p>
                  <p className="mt-1 text-sm font-bold leading-5 text-slate-600 sm:text-base">{step.helper}</p>

                  {step.action === "write_name" ? <HandwritingBadge initialPreview={badgePreview} onChange={(hasInk, preview) => { setBadgeHasInk(hasInk); setBadgePreview(preview); if (hasInk) playEffect("tap"); }} /> : null}

                  {step.action === "explore" ? (
                    <div className="mt-4">
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {ACTIVITY_STATION_IDS.map((id) => <button key={id} type="button" onClick={() => visitStation(id)} className={`min-h-14 min-w-24 rounded-2xl border-3 px-3 text-sm font-black transition ${activeStation === id ? "border-violet-700 bg-violet-700 text-white" : stationOpinions[id] ? "border-emerald-400 bg-emerald-100 text-emerald-900" : "border-violet-200 bg-white text-violet-900"}`}><span className="mr-1 text-xl">{STATIONS[id].emoji}</span>{STATIONS[id].label}</button>)}
                      </div>
                      {activeStation ? <div className={`mt-2 rounded-2xl border-3 border-violet-200 bg-violet-50 p-3 ${styles.rewardPop}`}><p className="text-center text-lg font-black text-violet-950">What do you think about {STATIONS[activeStation].short}?</p><div className="mt-3 grid grid-cols-2 gap-3"><button type="button" onClick={() => setOpinion(activeStation, "like")} className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border-3 px-4 text-base font-black transition hover:scale-[1.02] ${stationOpinions[activeStation] === "like" ? "border-emerald-600 bg-emerald-500 text-white" : "border-emerald-300 bg-white text-emerald-800"}`}><ThumbsUp className="h-6 w-6" /> I like it</button><button type="button" onClick={() => setOpinion(activeStation, "dont_like")} className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border-3 px-4 text-base font-black transition hover:scale-[1.02] ${stationOpinions[activeStation] === "dont_like" ? "border-sky-700 bg-sky-600 text-white" : "border-sky-300 bg-white text-sky-800"}`}><ThumbsDown className="h-6 w-6" /> Not for me</button></div></div> : <p className="mt-2 rounded-xl bg-yellow-100 p-3 text-center font-black text-yellow-900"><MousePointer2 className="mr-2 inline h-5 w-5 animate-bounce" />Choose any station to begin.</p>}
                    </div>
                  ) : null}

                  {step.action === "choose" ? (
                    <div className="mt-4">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{ACTIVITY_STATION_IDS.map((id) => <button key={id} type="button" onClick={() => { if (stationChoice !== id) { choiceVoice.clear(); clearSpeakingPart("station-choice"); } setStationChoice(id); playEffect("tap"); playDialogue("s1-explain-choice"); }} className={`min-h-14 rounded-2xl border-3 px-3 text-sm font-black ${stationChoice === id ? "border-violet-700 bg-violet-700 text-white" : "border-violet-200 bg-violet-50 text-violet-900"}`}><span className="mr-1 text-xl">{STATIONS[id].emoji}</span>{STATIONS[id].label}</button>)}</div>
                      {stationChoice ? <div className="mt-3 rounded-2xl bg-violet-50 p-3"><p className="text-xl font-black text-violet-950 sm:text-2xl">I’d like to visit <span className="text-fuchsia-700">{STATIONS[stationChoice].label}</span> because…</p><VoiceControls recorder={choiceVoice} buttonLabel="Say my answer" promptId="station-choice" stationId={stationChoice} feedback={speakingFeedback["station-choice"] ?? null} onFeedback={acceptSpeakingFeedback} onRecordingStart={() => clearSpeakingPart("station-choice")} onFeedbackUnavailable={() => playDialogue("s1-feedback-service-resting")} onSkip={() => completeSpeakingPart("station-choice")} /></div> : null}
                    </div>
                  ) : null}

                  {step.action === "checkup" ? (
                    currentCheck ? <div className="mt-4 rounded-2xl border-3 border-yellow-300 bg-yellow-50 p-3 sm:p-4"><p className="text-2xl font-black text-violet-950 sm:text-3xl">{currentCheck.prompt}</p><div className="mt-3 grid gap-3 sm:grid-cols-3">{currentCheck.options.map((answer) => <button key={answer} type="button" onClick={() => answerCheck(answer)} className="min-h-16 rounded-2xl border-3 border-violet-200 bg-white px-4 text-lg font-black text-violet-950 shadow-sm transition hover:-translate-y-1 hover:border-violet-600 active:translate-y-0">{answer}</button>)}</div>{wrongCheck ? <p className="mt-3 flex items-center gap-2 rounded-xl bg-amber-100 p-3 font-black text-amber-900"><Lightbulb className="h-5 w-5" />{currentCheck.hint}</p> : null}</div> : <div className={`mt-4 rounded-2xl bg-emerald-100 p-4 text-center text-xl font-black text-emerald-900 ${styles.rewardPop}`}><Sparkles className="mx-auto h-9 w-9" />Three picture power-ups collected!</div>
                  ) : null}

                  {step.action === "record" ? <div className="mt-4"><div className="grid grid-cols-3 gap-2 text-center"><span className="rounded-2xl bg-sky-100 p-3 font-black text-sky-900">🪪 My name</span><span className="rounded-2xl bg-amber-100 p-3 font-black text-amber-900">🎂 My age</span><span className="rounded-2xl bg-emerald-100 p-3 font-black text-emerald-900">❤️ I like…</span></div><button type="button" onClick={() => playDialogue("s1-baseline-model")} className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-2xl border-2 border-sky-300 bg-sky-50 px-5 font-black text-sky-900 shadow-sm transition hover:scale-[1.02] active:scale-95"><Volume2 className="h-5 w-5" />Hear an example</button><VoiceControls recorder={baselineVoice} buttonLabel="Start my sample" promptId="baseline" feedback={speakingFeedback.baseline ?? null} onFeedback={acceptSpeakingFeedback} onRecordingStart={() => clearSpeakingPart("baseline")} onFeedbackUnavailable={() => playDialogue("s1-feedback-service-resting")} onSkip={() => completeSpeakingPart("baseline")} /></div> : null}

                  {step.action === "reflect" ? <div className="mt-4 grid gap-4 lg:grid-cols-2"><div><p className="mb-2 font-black text-slate-700">How did speaking feel?</p><div className="grid gap-2">{["I felt ready", "I needed thinking time", "I want more practice"].map((option) => <button key={option} type="button" onClick={() => { setReflection(option); playEffect("tap"); }} className={`min-h-12 rounded-2xl border-3 px-4 text-left font-black ${reflection === option ? "border-violet-700 bg-violet-700 text-white" : "border-violet-200 bg-white text-violet-900"}`}>{option}</button>)}</div></div><div><p className="mb-2 font-black text-slate-700">My next power-up:</p><div className="grid gap-2">{["Say a longer reason", "Make my words clearer", "Learn more fair words"].map((option) => <button key={option} type="button" onClick={() => { setNextStepGoal(option); playEffect("tap"); }} className={`min-h-12 rounded-2xl border-3 px-4 text-left font-black ${nextStepGoal === option ? "border-emerald-700 bg-emerald-600 text-white" : "border-emerald-200 bg-white text-emerald-900"}`}><Flag className="mr-2 inline h-5 w-5" />{option}</button>)}</div></div></div> : null}

                  {message ? <p className="mt-3 rounded-xl bg-emerald-100 px-4 py-2 text-sm font-black text-emerald-800" role="status">{message}</p> : null}

                  {step.action === "complete" ? <div className="mt-4 flex flex-wrap justify-center gap-3"><Link href={pilotMode ? "/pilots/grade-4-learning-paths/unit-1/session-1/practice" : "/primary/learn/grade-4/unit-1/session-1/practice"} className={`inline-flex min-h-16 items-center gap-3 rounded-2xl bg-gradient-to-r from-violet-700 to-fuchsia-600 px-8 text-lg font-black text-white shadow-lg ring-4 ring-violet-200 transition hover:scale-105 ${styles.playPulse}`}><Heart className="h-6 w-6 fill-white" />Play practice activities</Link><Link href={pilotMode ? "/pilots/grade-4-learning-paths" : "/primary/learn/grade-4"} className="inline-flex min-h-16 items-center rounded-2xl border-3 border-violet-200 bg-white px-6 text-base font-black text-violet-900">Back to Unit 1</Link></div> : canContinue ? <div className="mt-4 flex justify-center"><button type="button" onClick={advance} className={`inline-flex min-h-16 min-w-64 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-violet-700 to-fuchsia-600 px-8 text-lg font-black text-white shadow-[0_10px_24px_rgba(109,40,217,.36)] ring-4 ring-violet-200 transition hover:scale-105 active:scale-95 ${styles.playPulse}`}><MousePointer2 className="h-6 w-6 fill-white" />{step.action === "write_name" ? "Wear my badge" : step.action === "checkup" ? "Power up!" : "Continue"}<ChevronRight className="h-6 w-6" /></button></div> : step.action === "observe" ? <p className="mt-3 rounded-xl bg-yellow-100 p-3 text-center font-black text-yellow-900"><MousePointer2 className="mr-2 inline h-6 w-6 animate-bounce" />Tap a glowing place in the picture.</p> : step.action === "explore" ? <p className="mt-3 text-center text-sm font-black text-violet-800">Choose an opinion at {ACTIVITY_STATION_IDS.length - exploredCount} more station{ACTIVITY_STATION_IDS.length - exploredCount === 1 ? "" : "s"}.</p> : null}
                </div>
              </div>
            </div>

            {entryState !== "ready" ? <IntroGate opening={entryState === "opening"} returning={stepIndex > 0} onStart={enterLesson} /> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
