"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Heart,
  Lightbulb,
  Mic,
  MousePointer2,
  RotateCcw,
  Sparkles,
  Square,
  Star,
  Volume2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { unlockSpeechSynthesis } from "@/lib/audio/tts";
import { useSingleChannelLessonAudio } from "@/lib/audio/use-single-channel-lesson-audio";
import {
  SESSION_2_CHECKS,
  SESSION_2_FRIENDS,
  SESSION_2_PROFILE_TOKENS,
  SESSION_2_QUESTION,
  type Session2Friend,
  type Session2FriendId,
} from "@/lib/curriculum/session-2";
import {
  SESSION_2_DIALOGUE,
  type Session2DialogueId,
} from "@/lib/curriculum/session-2-dialogue.generated";
import type { Session2CourseRunRecord } from "@/lib/curriculum/session-2-run";
import { useGrade4Session2Autosave } from "@/lib/curriculum/use-session-2-run-autosave";
import { createAudioMediaRecorder, recordedAudioFile } from "@/lib/media/recorded-audio";
import styles from "./Grade4Session1Pilot.module.css";

type StageId = "mission" | "question" | "friends" | "match" | "introduce" | "check" | "reflect";
type KeelanPose = "hello" | "listening" | "explaining" | "pointing" | "encouraging";

type Stage = {
  id: StageId;
  eyebrow: string;
  line: string;
  helper: string;
  pose: KeelanPose;
  audioId: Session2DialogueId;
};

const STAGES: Stage[] = [
  { id: "mission", eyebrow: "Friend Finder mission", line: SESSION_2_DIALOGUE["s2-welcome"].text, helper: "Find the four picture clues we need for each friend.", pose: "hello", audioId: "s2-welcome" },
  { id: "question", eyebrow: "Question power", line: SESSION_2_DIALOGUE["s2-question-intro"].text, helper: "Tap the chunks in the right order.", pose: "explaining", audioId: "s2-question-intro" },
  { id: "friends", eyebrow: "Meet the fair friends", line: SESSION_2_DIALOGUE["s2-friends-intro"].text, helper: "You can meet Mia, Leo, and Sam in any order.", pose: "listening", audioId: "s2-friends-intro" },
  { id: "match", eyebrow: "Choose your match", line: SESSION_2_DIALOGUE["s2-match-intro"].text, helper: "There is no wrong choice.", pose: "pointing", audioId: "s2-match-intro" },
  { id: "introduce", eyebrow: "Introduce a friend", line: SESSION_2_DIALOGUE["s2-introduce"].text, helper: "Choose the two missing parts of the sentence.", pose: "explaining", audioId: "s2-introduce" },
  { id: "check", eyebrow: "Three clue challenge", line: SESSION_2_DIALOGUE["s2-check-intro"].text, helper: "Listen or read, then choose the best answer.", pose: "pointing", audioId: "s2-check-intro" },
  { id: "reflect", eyebrow: "Friend Finder complete", line: SESSION_2_DIALOGUE["s2-reflect"].text, helper: "Choose the power you used today.", pose: "encouraging", audioId: "s2-reflect" },
];

const KEELAN_POSES: Record<KeelanPose, string> = {
  hello: "/curriculum/grade-4-movers/characters/poses/keelan-hello-wave.webp",
  listening: "/curriculum/grade-4-movers/characters/poses/keelan-listening.webp",
  explaining: "/curriculum/grade-4-movers/characters/poses/keelan-explaining.webp",
  pointing: "/curriculum/grade-4-movers/characters/poses/keelan-pointing.webp",
  encouraging: "/curriculum/grade-4-movers/characters/poses/keelan-encouraging.webp",
};

const PROFILE_TOKEN_AUDIO: Record<string, Session2DialogueId> = {
  name: "s2-clue-name",
  age: "s2-clue-age",
  interest: "s2-clue-likes",
  ability: "s2-clue-can",
};

const CHECK_QUESTION_AUDIO: Session2DialogueId[] = [
  "s2-check-question-mia",
  "s2-check-question-leo",
  "s2-check-question-sam",
];

type RecorderState = {
  recording: boolean;
  audioUrl: string | null;
  error: string | null;
  duration: number;
  start: () => Promise<void>;
  stop: () => void;
  clear: () => void;
};

function useQuestionRecorder(maxSeconds = 8): RecorderState {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const clear = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setError(null);
    setDuration(0);
  }, [audioUrl]);

  const start = useCallback(async () => {
    clear();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Voice recording is not available on this device.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      window.localStorage.setItem("wke-microphone-ready", "yes");
      const recorder = createAudioMediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const file = recordedAudioFile(chunksRef.current, recorder.mimeType, "session-2-question");
        setAudioUrl(URL.createObjectURL(file));
        setRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (timerRef.current !== null) window.clearInterval(timerRef.current);
      };
      startedAtRef.current = Date.now();
      setRecording(true);
      recorder.start(250);
      timerRef.current = window.setInterval(() => {
        const elapsed = Math.round((Date.now() - startedAtRef.current) / 1000);
        setDuration(Math.min(maxSeconds, elapsed));
        if (elapsed >= maxSeconds) stop();
      }, 250);
    } catch {
      setError("Keelan couldn't hear the microphone. You can use the model and keep going.");
      setRecording(false);
    }
  }, [clear, maxSeconds, stop]);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  return { recording, audioUrl, error, duration, start, stop, clear };
}

function BigButton({ children, onClick, disabled = false }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-16 min-w-56 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-violet-700 to-fuchsia-600 px-7 text-lg font-black text-white shadow-xl ring-4 ring-violet-200 transition hover:scale-[1.03] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${!disabled ? styles.playPulse : ""}`}
    >
      {children}
    </button>
  );
}

function FriendCard({ friend, visited, selected, onClick }: { friend: Session2Friend; visited?: boolean; selected?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative min-h-36 rounded-[1.6rem] border-4 p-4 text-left shadow-lg transition hover:-translate-y-1 active:translate-y-0 ${selected ? "border-violet-700 bg-violet-100" : visited ? "border-emerald-500 bg-emerald-50" : "border-white bg-white/95"}`}
    >
      <span className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br text-4xl ${friend.colour}`}>{friend.avatar}</span>
      <span className="mt-2 block text-xl font-black text-slate-950">{friend.name}</span>
      <span className="block text-xs font-bold text-slate-600">{friend.visualAnchor}</span>
      {visited ? <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white"><Check className="h-6 w-6" /></span> : null}
    </button>
  );
}

export function Grade4Session2Pilot({ pilotMode = false, initialRun = null }: { pilotMode?: boolean; initialRun?: Session2CourseRunRecord | null }) {
  const restored = initialRun?.state;
  const restoredStageIndex = restored ? STAGES.findIndex((item) => item.id === restored.activeStageId) : -1;
  const [started, setStarted] = useState(false);
  const [stageIndex, setStageIndex] = useState(restoredStageIndex >= 0 ? restoredStageIndex : 0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [talking, setTalking] = useState(false);
  const [foundTokens, setFoundTokens] = useState<string[]>(restored?.foundTokenIds ?? []);
  const [questionChunks, setQuestionChunks] = useState<string[]>(restored?.questionChunks ?? []);
  const [questionMessage, setQuestionMessage] = useState<string | null>(null);
  const [questionUsed, setQuestionUsed] = useState(restored?.questionUsed ?? false);
  const [activeFriendId, setActiveFriendId] = useState<Session2FriendId | null>(null);
  const [visitedFriendIds, setVisitedFriendIds] = useState<Session2FriendId[]>(restored?.visitedFriendIds ?? []);
  const [profileDraft, setProfileDraft] = useState<{ interest?: string; ability?: string }>({});
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [chosenFriendId, setChosenFriendId] = useState<Session2FriendId | null>(restored?.chosenFriendId ?? null);
  const [introPronoun, setIntroPronoun] = useState<string | null>(restored?.introPronoun ?? null);
  const [introInterest, setIntroInterest] = useState<string | null>(restored?.introInterest ?? null);
  const [checkIndex, setCheckIndex] = useState(restored?.checkIndex ?? 0);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);
  const [reflection, setReflection] = useState<string | null>(restored?.reflection ?? null);
  const recorder = useQuestionRecorder();
  const { play: playLine, stop: stopAudio } = useSingleChannelLessonAudio({
    enabled: soundEnabled,
    onPlayingChange: setTalking,
  });

  const stage = STAGES[stageIndex];
  const activeFriend = SESSION_2_FRIENDS.find((friend) => friend.id === activeFriendId) ?? null;
  const chosenFriend = SESSION_2_FRIENDS.find((friend) => friend.id === chosenFriendId) ?? null;
  const currentCheck = SESSION_2_CHECKS[checkIndex] ?? null;
  const progress = Math.round(((stageIndex + 1) / STAGES.length) * 100);

  const playDialogue = useCallback((id: Session2DialogueId) => {
    const clip = SESSION_2_DIALOGUE[id];
    playLine(clip.text, 0.88, clip.audioUrl, clip.playbackRate);
  }, [playLine]);

  useEffect(() => {
    if (!started || !stage) return;
    const id = window.setTimeout(() => playDialogue(stage.audioId), 300);
    return () => window.clearTimeout(id);
  }, [playDialogue, stage, started]);

  useEffect(() => {
    if (!started || stage.id !== "check") return;
    if (!currentCheck) {
      const completeId = window.setTimeout(() => playDialogue("s2-check-complete"), 500);
      return () => window.clearTimeout(completeId);
    }
    const questionId = CHECK_QUESTION_AUDIO[checkIndex];
    if (!questionId) return;
    const id = window.setTimeout(() => playDialogue(questionId), checkIndex === 0 ? 2400 : 750);
    return () => window.clearTimeout(id);
  }, [checkIndex, currentCheck, playDialogue, stage.id, started]);

  const remainingQuestionChunks = useMemo(() => {
    const counts = new Map<string, number>();
    questionChunks.forEach((chunk) => counts.set(chunk, (counts.get(chunk) ?? 0) + 1));
    return SESSION_2_QUESTION.shuffledChunks.filter((chunk) => {
      const used = counts.get(chunk) ?? 0;
      if (used <= 0) return true;
      counts.set(chunk, used - 1);
      return false;
    });
  }, [questionChunks]);

  const questionBuilt = questionChunks.join(" ") === SESSION_2_QUESTION.model;
  const introComplete = Boolean(chosenFriend && introPronoun === chosenFriend.pronoun && introInterest === chosenFriend.interest);
  const runProgress = useMemo(() => ({
    activeStageId: stage.id,
    foundTokenIds: foundTokens,
    questionChunks,
    questionUsed,
    visitedFriendIds,
    chosenFriendId,
    introPronoun,
    introInterest,
    checkIndex,
    reflection,
    activePracticeActivityId: restored?.activePracticeActivityId ?? null,
    completedPracticeActivityIds: restored?.completedPracticeActivityIds ?? [],
    writingDraft: restored?.writingDraft ?? "",
  }), [checkIndex, chosenFriendId, foundTokens, introInterest, introPronoun, questionChunks, questionUsed, reflection, restored?.activePracticeActivityId, restored?.completedPracticeActivityIds, restored?.writingDraft, stage.id, visitedFriendIds]);
  const saveState = useGrade4Session2Autosave({ enabled: !pilotMode, status: reflection ? "completed" : "in_progress", activeStepId: stage.id, progress: runProgress });

  function advance() {
    stopAudio();
    setStageIndex((index) => Math.min(STAGES.length - 1, index + 1));
  }

  function selectQuestionChunk(chunk: string) {
    const next = [...questionChunks, chunk];
    setQuestionChunks(next);
    setQuestionMessage(null);
    if (next.length === SESSION_2_QUESTION.chunks.length) {
      if (next.join(" ") === SESSION_2_QUESTION.model) {
        setQuestionMessage("Question power ready!");
        playDialogue("s2-question-success");
      } else {
        setQuestionMessage("Good try. Start with the question word: What.");
      }
    }
  }

  function openFriend(friend: Session2Friend) {
    setActiveFriendId(friend.id);
    setProfileDraft({});
    setProfileMessage(null);
    if (questionUsed) playDialogue(`s2-${friend.id}-profile` as Session2DialogueId);
  }

  function useQuestion() {
    setQuestionUsed(true);
    playDialogue("s2-recording-ready");
    if (activeFriend) window.setTimeout(() => playDialogue(`s2-${activeFriend.id}-profile` as Session2DialogueId), 2400);
  }

  function answerProfile(kind: "interest" | "ability", answer: string) {
    if (!activeFriend) return;
    const correct = kind === "interest" ? activeFriend.interest : activeFriend.ability;
    if (answer !== correct) {
      setProfileMessage(`Listen once more. Look for the ${activeFriend.visualAnchor}.`);
      playDialogue(`s2-profile-retry-${activeFriend.id}` as Session2DialogueId);
      return;
    }
    const next = { ...profileDraft, [kind]: answer };
    setProfileDraft(next);
    setProfileMessage("Yes—you heard it!");
    playDialogue("s2-profile-correct");
    if (next.interest === activeFriend.interest && next.ability === activeFriend.ability) {
      setVisitedFriendIds((ids) => {
        const updated = ids.includes(activeFriend.id) ? ids : [...ids, activeFriend.id];
        if (updated.length === SESSION_2_FRIENDS.length) window.setTimeout(() => playDialogue("s2-all-profiles"), 1000);
        return updated;
      });
      window.setTimeout(() => {
        setActiveFriendId(null);
        setProfileDraft({});
        setProfileMessage(null);
      }, 900);
    }
  }

  function answerCheck(answer: string) {
    if (!currentCheck) return;
    if (answer !== currentCheck.answer) {
      setCheckMessage(currentCheck.hint);
      playDialogue((checkIndex === 0 ? "s2-check-hint-mia" : checkIndex === 1 ? "s2-check-hint-leo" : "s2-check-hint-sam"));
      return;
    }
    setCheckMessage("Clue collected!");
    playDialogue((checkIndex % 3 === 0 ? "s2-check-correct-a" : checkIndex % 3 === 1 ? "s2-check-correct-b" : "s2-check-correct-c"));
    window.setTimeout(() => {
      setCheckIndex((index) => index + 1);
      setCheckMessage(null);
    }, 650);
  }

  if (!stage) return null;

  if (!started) {
    return (
      <main className="relative min-h-dvh overflow-hidden bg-violet-950 text-white">
        <Image src="/curriculum/grade-4-movers/unit-1/welcome-fair.png" alt="The Welcome Fair" fill priority className="object-cover" unoptimized />
        <div className="absolute inset-0 bg-violet-950/70" />
        <div className={`absolute -left-[18vmax] -top-[18vmax] h-[55vmax] w-[55vmax] rounded-full opacity-50 ${styles.spiral}`} />
        <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-5 text-center">
          <div className="relative h-56 w-52 sm:h-72 sm:w-64">
            <Image src={KEELAN_POSES.hello} alt="Keelan waving hello" fill priority className={`object-contain ${styles.keelanIdle}`} unoptimized />
          </div>
          <p className="mt-2 text-sm font-black uppercase tracking-[.22em] text-amber-300">Unit 1 · Session 2</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-6xl">Find a Fair Friend</h1>
          <p className="mt-3 max-w-xl text-lg font-bold text-violet-100">Ask. Listen. Remember. Introduce.</p>
          {restored ? <p className="mt-3 rounded-full bg-white/10 px-4 py-2 text-sm font-black text-violet-100">Your Friend Finder progress is ready to continue.</p> : null}
          <button
            type="button"
            onClick={() => {
              unlockSpeechSynthesis();
              setStarted(true);
            }}
            className={`mt-7 flex h-24 w-24 items-center justify-center rounded-full bg-amber-300 text-violet-950 shadow-2xl ring-8 ring-white/30 transition hover:scale-110 active:scale-95 sm:h-28 sm:w-28 ${styles.playPulse}`}
            aria-label="Start Session 2"
          >
            <MousePointer2 className="h-12 w-12 fill-violet-950" />
          </button>
          <p className="mt-5 text-sm font-black text-white/80">Tap to begin</p>
          <p className="mt-2 text-[11px] font-bold text-white/55">Character voices are AI-generated.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-slate-950 text-slate-950">
      <Image src="/curriculum/grade-4-movers/unit-1/welcome-fair.png" alt="Children sharing hobbies at the Welcome Fair" fill priority className="object-cover" unoptimized />
      <div className="absolute inset-0 bg-[#180d35]/65" />

      <header className="absolute inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-4">
        <div className="mx-auto flex max-w-7xl items-center gap-3 rounded-2xl border border-white/20 bg-violet-950/90 px-3 py-2 text-white shadow-xl backdrop-blur sm:px-4">
          <Link href="/pilots/grade-4-learning-paths" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10" aria-label="Back to Grade 4 learning paths"><ArrowLeft className="h-5 w-5" /></Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[.14em] text-violet-200"><span>Session 2 · Find a Fair Friend</span><span>{progress}%</span></div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-emerald-300 transition-all" style={{ width: `${progress}%` }} /></div>
          </div>
          {!pilotMode ? <span className={`hidden rounded-full px-3 py-1 text-[10px] font-black uppercase sm:inline ${saveState === "error" ? "bg-amber-200 text-amber-950" : "bg-white/10 text-violet-100"}`}>{saveState === "saving" ? "Saving" : saveState === "error" ? "Save paused" : "Saved"}</span> : null}
          <button type="button" onClick={() => { setSoundEnabled((value) => !value); if (soundEnabled) stopAudio(); }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10" aria-label={soundEnabled ? "Turn sound off" : "Turn sound on"}><Volume2 className={`h-5 w-5 ${soundEnabled ? "" : "opacity-40"}`} /></button>
        </div>
      </header>

      <div className="pointer-events-none absolute bottom-0 left-[-5rem] z-10 hidden h-[72vh] w-[44vw] min-w-[28rem] lg:block">
        <Image src={KEELAN_POSES[stage.pose]} alt="Keelan, your learning guide" fill className={`object-contain object-bottom opacity-100 ${talking ? styles.keelanTalk : styles.keelanIdle}`} unoptimized />
      </div>

      <section className="relative z-20 flex min-h-dvh items-end px-2 pb-2 pt-24 sm:px-4 sm:pb-4 lg:items-center lg:justify-end lg:px-8">
        <div className="w-full overflow-hidden rounded-[1.7rem] border-4 border-white/80 bg-white/97 shadow-2xl lg:w-[68%] lg:max-w-5xl">
          <div className="flex items-start gap-3 border-b border-violet-100 bg-gradient-to-r from-violet-50 to-fuchsia-50 p-4 sm:p-5">
            <div className="relative h-20 w-16 shrink-0 lg:hidden">
              <Image src={KEELAN_POSES[stage.pose]} alt="Keelan" fill className={`object-contain ${talking ? styles.keelanTalk : styles.keelanIdle}`} unoptimized />
            </div>
            <button type="button" onClick={() => playDialogue(stage.audioId)} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-700 text-white shadow-md" aria-label="Hear Keelan"><Volume2 className="h-6 w-6" /></button>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-violet-700">{stage.eyebrow}</p>
              <p className="mt-1 text-xl font-black leading-7 sm:text-3xl sm:leading-9">{stage.line}</p>
              <p className="mt-1 text-sm font-bold text-slate-600 sm:text-base">{stage.helper}</p>
            </div>
          </div>

          <div className="max-h-[62dvh] overflow-y-auto p-4 sm:p-6 lg:max-h-[70dvh]">
            {stage.id === "mission" ? (
              <div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {SESSION_2_PROFILE_TOKENS.map((token) => {
                    const found = foundTokens.includes(token.id);
                    return (
                      <button key={token.id} type="button" onClick={() => { setFoundTokens((ids) => { const updated = ids.includes(token.id) ? ids : [...ids, token.id]; playDialogue(updated.length === SESSION_2_PROFILE_TOKENS.length ? "s2-finder-open" : PROFILE_TOKEN_AUDIO[token.id]); return updated; }); }} className={`relative min-h-28 rounded-3xl border-4 p-3 text-center transition hover:-translate-y-1 ${found ? "border-emerald-500 bg-emerald-100" : "border-amber-300 bg-amber-50"}`}>
                        {!found ? <span className="absolute inset-[-.35rem] animate-ping rounded-3xl border-4 border-amber-300/60 motion-reduce:animate-none" /> : null}
                        <span className="block text-4xl">{token.icon}</span>
                        <span className="mt-2 block text-lg font-black capitalize">{token.label}</span>
                        {found ? <Check className="absolute right-2 top-2 h-6 w-6 text-emerald-700" /> : null}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-5 flex justify-center"><BigButton onClick={advance} disabled={foundTokens.length < SESSION_2_PROFILE_TOKENS.length}>Open the Friend Finder <ChevronRight className="h-6 w-6" /></BigButton></div>
              </div>
            ) : null}

            {stage.id === "question" ? (
              <div>
                <button type="button" onClick={() => playDialogue("s2-question-model")} className="mx-auto flex min-h-14 items-center gap-2 rounded-2xl border-3 border-sky-300 bg-sky-50 px-5 text-lg font-black text-sky-900"><Volume2 className="h-5 w-5" /> Hear the question</button>
                <div className="mt-5 flex min-h-20 flex-wrap items-center justify-center gap-3 rounded-3xl border-4 border-dashed border-violet-300 bg-violet-50 p-4">
                  {questionChunks.length ? questionChunks.map((chunk, index) => <button type="button" key={`${chunk}-${index}`} onClick={() => setQuestionChunks((chunks) => chunks.filter((_, itemIndex) => itemIndex !== index))} className="min-h-14 rounded-2xl bg-violet-700 px-5 text-xl font-black text-white shadow-md">{chunk}</button>) : <span className="font-black text-violet-400">Build the question here</span>}
                </div>
                <div className="mt-4 flex flex-wrap justify-center gap-3">{remainingQuestionChunks.map((chunk) => <button type="button" key={chunk} onClick={() => selectQuestionChunk(chunk)} className="min-h-14 rounded-2xl border-3 border-violet-300 bg-white px-5 text-xl font-black text-violet-950 shadow-sm transition hover:-translate-y-1">{chunk}</button>)}</div>
                {questionMessage ? <p className={`mt-4 rounded-2xl p-3 text-center font-black ${questionBuilt ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}`}>{questionMessage}</p> : null}
                {!questionBuilt && questionChunks.length === SESSION_2_QUESTION.chunks.length ? <div className="mt-3 text-center"><button type="button" onClick={() => { setQuestionChunks([]); setQuestionMessage(null); }} className="inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-violet-300 px-4 font-black text-violet-800"><RotateCcw className="h-5 w-5" /> Try again</button></div> : null}
                <div className="mt-5 flex justify-center"><BigButton onClick={advance} disabled={!questionBuilt}>Use my question <ChevronRight className="h-6 w-6" /></BigButton></div>
              </div>
            ) : null}

            {stage.id === "friends" ? (
              <div>
                <div className="grid grid-cols-3 gap-2 sm:gap-4">{SESSION_2_FRIENDS.map((friend) => <FriendCard key={friend.id} friend={friend} visited={visitedFriendIds.includes(friend.id)} selected={activeFriendId === friend.id} onClick={() => openFriend(friend)} />)}</div>
                {activeFriend ? (
                  <div className={`mt-4 rounded-[1.6rem] border-4 border-violet-300 bg-white p-4 shadow-xl ${styles.rewardPop}`}>
                    <div className="flex items-center gap-3"><span className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-3xl ${activeFriend.colour}`}>{activeFriend.avatar}</span><div><p className="text-2xl font-black">Meet {activeFriend.name}</p><p className="text-sm font-bold text-slate-600">Ask first. Then listen for two clues.</p></div></div>
                    {!questionUsed ? (
                      <div className="mt-4 rounded-2xl bg-violet-50 p-4">
                        <p className="text-center text-2xl font-black text-violet-950">“{SESSION_2_QUESTION.model}”</p>
                        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                          {!recorder.recording ? <button type="button" onClick={() => { if (!window.localStorage.getItem("wke-microphone-ready")) playDialogue("s2-microphone-first-use"); void recorder.start(); }} className="inline-flex min-h-14 items-center gap-2 rounded-2xl bg-rose-600 px-6 font-black text-white"><Mic className="h-6 w-6" /> {recorder.audioUrl ? "Record again" : "Say the question"}</button> : <button type="button" onClick={recorder.stop} className="inline-flex min-h-14 items-center gap-2 rounded-2xl bg-rose-600 px-6 font-black text-white"><Square className="h-5 w-5" /> Stop · {recorder.duration}s</button>}
                          <button type="button" onClick={() => playDialogue("s2-question-model")} className="inline-flex min-h-14 items-center gap-2 rounded-2xl border-3 border-violet-300 bg-white px-5 font-black text-violet-900"><Volume2 className="h-5 w-5" /> Model</button>
                        </div>
                        {recorder.audioUrl ? <div className="mt-4 rounded-2xl bg-white p-3"><audio controls src={recorder.audioUrl} className="mx-auto h-11 max-w-full" /><div className="mt-3 flex justify-center"><BigButton onClick={useQuestion}>Ask {activeFriend.name} <ChevronRight className="h-6 w-6" /></BigButton></div></div> : null}
                        {recorder.error ? <p className="mt-3 rounded-xl bg-amber-100 p-3 text-center font-bold text-amber-900">{recorder.error}</p> : null}
                        <button type="button" onClick={useQuestion} className="mx-auto mt-3 block min-h-11 px-4 text-sm font-black text-violet-700 underline">Use the model and keep going</button>
                      </div>
                    ) : (
                      <div className="mt-4">
                        <button type="button" onClick={() => playDialogue(`s2-${activeFriend.id}-profile` as Session2DialogueId)} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-sky-100 px-4 text-lg font-black text-sky-950"><Volume2 className="h-6 w-6" /> Hear {activeFriend.name} again</button>
                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                          <div className="rounded-2xl bg-rose-50 p-3"><p className="text-lg font-black">What does {activeFriend.name} like?</p><div className="mt-2 grid gap-2">{SESSION_2_FRIENDS.map((friend) => <button key={friend.interest} type="button" onClick={() => answerProfile("interest", friend.interest)} className={`min-h-12 rounded-xl border-2 px-3 text-left font-black ${profileDraft.interest === friend.interest ? "border-emerald-500 bg-emerald-100" : "border-rose-200 bg-white"}`}>{friend.avatar} {friend.interestLabel}</button>)}</div></div>
                          <div className="rounded-2xl bg-amber-50 p-3"><p className="text-lg font-black">What can {activeFriend.name} do?</p><div className="mt-2 grid gap-2">{SESSION_2_FRIENDS.map((friend) => <button key={friend.ability} type="button" onClick={() => answerProfile("ability", friend.ability)} className={`min-h-12 rounded-xl border-2 px-3 text-left font-black ${profileDraft.ability === friend.ability ? "border-emerald-500 bg-emerald-100" : "border-amber-200 bg-white"}`}>⭐ {friend.abilityLabel}</button>)}</div></div>
                        </div>
                        {profileMessage ? <p className="mt-3 rounded-xl bg-violet-100 p-3 text-center font-black text-violet-900">{profileMessage}</p> : null}
                      </div>
                    )}
                  </div>
                ) : <p className="mt-4 rounded-2xl bg-amber-100 p-4 text-center text-lg font-black text-amber-950"><MousePointer2 className="mr-2 inline h-6 w-6 animate-bounce" />Choose any friend to begin.</p>}
                {visitedFriendIds.length === SESSION_2_FRIENDS.length ? <div className="mt-5 flex justify-center"><BigButton onClick={advance}>All profiles ready <ChevronRight className="h-6 w-6" /></BigButton></div> : <p className="mt-3 text-center text-sm font-black text-violet-800">{visitedFriendIds.length}/3 friend profiles complete</p>}
              </div>
            ) : null}

            {stage.id === "match" ? (
              <div><div className="grid grid-cols-3 gap-2 sm:gap-4">{SESSION_2_FRIENDS.map((friend) => <FriendCard key={friend.id} friend={friend} selected={chosenFriendId === friend.id} onClick={() => { setChosenFriendId(friend.id); playDialogue(`s2-match-${friend.id}` as Session2DialogueId); window.setTimeout(() => playDialogue(`s2-${friend.id}-greeting` as Session2DialogueId), 2100); }} />)}</div>{chosenFriend ? <p className="mt-4 rounded-2xl bg-emerald-100 p-4 text-center text-xl font-black text-emerald-900">You chose {chosenFriend.name}! {chosenFriend.pronoun} likes {chosenFriend.interest}.</p> : null}<div className="mt-5 flex justify-center"><BigButton onClick={advance} disabled={!chosenFriend}>Introduce my friend <ChevronRight className="h-6 w-6" /></BigButton></div></div>
            ) : null}

            {stage.id === "introduce" && chosenFriend ? (
              <div>
                <div className="rounded-3xl border-4 border-violet-300 bg-violet-50 p-5 text-center text-2xl font-black leading-relaxed sm:text-4xl">This is <span className="text-fuchsia-700">{chosenFriend.name}</span>.<br /><span className="inline-block min-w-20 rounded-xl bg-white px-2 text-violet-700">{introPronoun ?? "?"}</span> likes <span className="inline-block min-w-40 rounded-xl bg-white px-2 text-violet-700">{introInterest ?? "?"}</span>.</div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2"><div><p className="mb-2 text-center font-black">Choose a person word</p><div className="grid grid-cols-2 gap-2">{["He", "She"].map((option) => <button type="button" key={option} onClick={() => setIntroPronoun(option)} className={`min-h-14 rounded-2xl border-3 text-xl font-black ${introPronoun === option ? "border-violet-700 bg-violet-700 text-white" : "border-violet-200 bg-white"}`}>{option}</button>)}</div></div><div><p className="mb-2 text-center font-black">Choose the interest</p><div className="grid gap-2">{SESSION_2_FRIENDS.map((friend) => <button type="button" key={friend.interest} onClick={() => setIntroInterest(friend.interest)} className={`min-h-12 rounded-2xl border-3 px-3 font-black ${introInterest === friend.interest ? "border-fuchsia-600 bg-fuchsia-600 text-white" : "border-fuchsia-200 bg-white"}`}>{friend.avatar} {friend.interest}</button>)}</div></div></div>
                {introPronoun && introInterest && !introComplete ? <p className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-amber-100 p-3 font-black text-amber-900"><Lightbulb className="h-5 w-5" />Look at {chosenFriend.name}'s profile clues and try one part again.</p> : null}
                {introComplete ? <button type="button" onClick={() => playDialogue(`s2-intro-model-${chosenFriend.id}` as Session2DialogueId)} className="mx-auto mt-4 flex min-h-14 items-center gap-2 rounded-2xl bg-emerald-100 px-6 text-lg font-black text-emerald-900"><Volume2 className="h-5 w-5" /> Hear my introduction</button> : null}
                <div className="mt-5 flex justify-center"><BigButton onClick={advance} disabled={!introComplete}>Start the clue challenge <ChevronRight className="h-6 w-6" /></BigButton></div>
              </div>
            ) : null}

            {stage.id === "check" ? (
              currentCheck ? <div className="rounded-3xl border-4 border-amber-300 bg-amber-50 p-4 sm:p-6"><div className="flex items-center justify-between"><span className="rounded-full bg-violet-700 px-3 py-1 text-xs font-black text-white">CLUE {checkIndex + 1} OF 3</span><button type="button" onClick={() => playLine(currentCheck.prompt, 0.8)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-violet-700"><Volume2 className="h-5 w-5" /></button></div><p className="mt-4 text-2xl font-black sm:text-4xl">{currentCheck.prompt}</p><div className="mt-5 grid gap-3 sm:grid-cols-3">{currentCheck.options.map((option) => <button type="button" key={option} onClick={() => answerCheck(option)} className="min-h-20 rounded-2xl border-3 border-violet-200 bg-white px-4 text-lg font-black shadow-sm transition hover:-translate-y-1 hover:border-violet-600">{option}</button>)}</div>{checkMessage ? <p className="mt-4 rounded-xl bg-white p-3 text-center font-black text-violet-900">{checkMessage}</p> : null}</div> : <div className={`rounded-3xl bg-emerald-100 p-7 text-center ${styles.rewardPop}`}><Sparkles className="mx-auto h-12 w-12 text-emerald-700" /><p className="mt-2 text-3xl font-black text-emerald-950">Three clues collected!</p><div className="mt-5"><BigButton onClick={advance}>Finish my mission <ChevronRight className="h-6 w-6" /></BigButton></div></div>
            ) : null}

            {stage.id === "reflect" ? (
              <div className="text-center"><div className="mx-auto flex max-w-lg items-center justify-center gap-2 rounded-3xl bg-amber-100 p-5 text-amber-900"><Star className="h-10 w-10 fill-amber-400" /><Star className="h-14 w-14 fill-amber-400" /><Star className="h-10 w-10 fill-amber-400" /></div><p className="mt-5 text-xl font-black">Which power did you use most?</p><div className="mt-3 grid gap-3 sm:grid-cols-3">{[{ icon: "❓", label: "I can ask" }, { icon: "👂", label: "I can listen" }, { icon: "🧠", label: "I can remember" }].map((item) => <button type="button" key={item.label} onClick={() => { setReflection(item.label); playDialogue("s2-complete"); }} className={`min-h-28 rounded-3xl border-4 p-4 text-xl font-black transition hover:-translate-y-1 ${reflection === item.label ? "border-violet-700 bg-violet-700 text-white" : "border-violet-200 bg-white"}`}><span className="block text-4xl">{item.icon}</span>{item.label}</button>)}</div>{reflection ? <p className="mt-4 rounded-2xl bg-emerald-100 p-4 text-lg font-black text-emerald-900"><Heart className="mr-2 inline h-6 w-6 fill-rose-400 text-rose-400" />Power saved: {reflection}</p> : null}<div className="mt-5 flex flex-wrap justify-center gap-3"><Link onClick={() => playDialogue("s2-practice-invite")} href={pilotMode ? "/pilots/grade-4-learning-paths/unit-1/session-2/practice" : "/primary/learn/grade-4/unit-1/session-2/practice"} className={`inline-flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-violet-700 to-fuchsia-600 px-7 text-lg font-black text-white shadow-xl ring-4 ring-violet-200 transition hover:scale-[1.03] ${reflection ? styles.playPulse : "pointer-events-none opacity-40"}`}>Play practice games <ChevronRight className="h-6 w-6" /></Link><Link href={pilotMode ? "/pilots/grade-4-learning-paths" : "/primary/learn/grade-4"} className="inline-flex min-h-14 items-center rounded-2xl border-3 border-violet-200 bg-white px-5 font-black text-violet-900">Back to Unit 1</Link></div></div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
