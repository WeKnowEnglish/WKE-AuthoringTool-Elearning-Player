"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check, ChevronRight, Heart, Mic, MousePointer2, RotateCcw, Sparkles, Square, Star, Volume2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { unlockSpeechSynthesis } from "@/lib/audio/tts";
import { useSingleChannelLessonAudio } from "@/lib/audio/use-single-channel-lesson-audio";
import { SESSION_3_ACTIVITIES, SESSION_3_CHECKS, SESSION_3_FRIENDS, type Session3ActivityId, type Session3Friend, type Session3FriendId } from "@/lib/curriculum/session-3";
import { SESSION_3_DIALOGUE, type Session3DialogueId } from "@/lib/curriculum/session-3-dialogue.generated";
import type { Session3CourseRunRecord } from "@/lib/curriculum/session-3-run";
import { useGrade4Session3Autosave } from "@/lib/curriculum/use-session-3-run-autosave";
import { useLocalAudioRecorder } from "@/lib/media/use-local-audio-recorder";
import styles from "./Grade4Session1Pilot.module.css";

type StageId = "mission" | "favourite" | "question" | "chats" | "match" | "common" | "check" | "reflect";
type KeelanPose = "hello" | "listening" | "explaining" | "pointing" | "encouraging";

const STAGES: Array<{ id: StageId; eyebrow: string; helper: string; pose: KeelanPose; audioId?: Session3DialogueId }> = [
  { id: "mission", eyebrow: "Friendship Circle mission", helper: "Find the three glowing activity badges.", pose: "hello", audioId: "s3-mission" },
  { id: "favourite", eyebrow: "Your favourite", helper: "Choose the activity you like most.", pose: "pointing", audioId: "s3-choose-favourite" },
  { id: "question", eyebrow: "Follow-up question", helper: "Build and record Do you like...?", pose: "explaining", audioId: "s3-question-intro" },
  { id: "chats", eyebrow: "Ask three friends", helper: "Meet them in any order and listen for yes or no.", pose: "listening", audioId: "s3-chats-intro" },
  { id: "match", eyebrow: "Find common ground", helper: "Choose the friend who said yes.", pose: "pointing", audioId: "s3-match-intro" },
  { id: "common", eyebrow: "We both like...", helper: "Build and record your shared-interest sentence.", pose: "encouraging" },
  { id: "check", eyebrow: "Three clue check", helper: "Show what you remember.", pose: "pointing", audioId: "s3-check-intro" },
  { id: "reflect", eyebrow: "Friendship Circle complete", helper: "Choose the power that helped you most.", pose: "encouraging", audioId: "s3-reflect" },
];

const POSES: Record<KeelanPose, string> = {
  hello: "/curriculum/grade-4-movers/characters/poses/keelan-hello-wave.webp",
  listening: "/curriculum/grade-4-movers/characters/poses/keelan-listening.webp",
  explaining: "/curriculum/grade-4-movers/characters/poses/keelan-explaining.webp",
  pointing: "/curriculum/grade-4-movers/characters/poses/keelan-pointing.webp",
  encouraging: "/curriculum/grade-4-movers/characters/poses/keelan-encouraging.webp",
};
const BADGE_AUDIO: Record<Session3ActivityId, Session3DialogueId> = { painting: "s3-badge-painting", football: "s3-badge-football", reading: "s3-badge-reading" };
const QUESTION_AUDIO: Record<Session3ActivityId, Session3DialogueId> = { painting: "s3-question-painting", football: "s3-question-football", reading: "s3-question-reading" };
const COMMON_AUDIO: Record<Session3ActivityId, Session3DialogueId> = { painting: "s3-common-painting", football: "s3-common-football", reading: "s3-common-reading" };
const CHECK_AUDIO: Session3DialogueId[] = ["s3-check-football", "s3-check-negative", "s3-check-shared"];

function FriendshipCircleScene() {
  return (
    <picture className="absolute inset-0">
      <source media="(max-width: 639px)" srcSet="/curriculum/grade-4-movers/unit-1/session-3-friendship-circle-mobile.webp" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/curriculum/grade-4-movers/unit-1/session-3-friendship-circle.webp"
        alt=""
        aria-hidden="true"
        className="h-full w-full object-cover"
      />
    </picture>
  );
}

function BigButton({ children, onClick, disabled = false }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex min-h-16 min-w-56 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-violet-700 to-fuchsia-600 px-7 text-lg font-black text-white shadow-xl ring-4 ring-violet-200 transition hover:scale-[1.03] disabled:opacity-40 ${!disabled ? styles.playPulse : ""}`}>{children}</button>;
}

function FriendCard({ friend, visited, selected, onClick }: { friend: Session3Friend; visited?: boolean; selected?: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`relative min-h-32 rounded-3xl border-4 p-3 text-center shadow-lg transition hover:-translate-y-1 ${selected ? "border-violet-700 bg-violet-100" : visited ? "border-emerald-500 bg-emerald-50" : "border-white bg-white"}`}><span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-4xl ${friend.colour}`}>{friend.avatar}</span><span className="mt-2 block text-xl font-black">{friend.name}</span>{visited ? <span className="absolute right-2 top-2 rounded-full bg-emerald-500 p-1 text-white"><Check className="h-5 w-5" /></span> : null}</button>;
}

function RecordPanel({ recorder, onStart, onKeep, model }: { recorder: ReturnType<typeof useLocalAudioRecorder>; onStart: () => void; onKeep: () => void; model: () => void }) {
  return <div className="mt-5 rounded-3xl border-3 border-rose-200 bg-rose-50 p-4"><button type="button" onClick={model} className="mx-auto flex min-h-12 items-center gap-2 rounded-xl bg-white px-4 font-black"><Volume2 className="h-5 w-5" />Hear the model</button><div className="mt-4 flex flex-wrap items-center justify-center gap-3">{!recorder.recording ? <button type="button" onClick={onStart} className="inline-flex min-h-14 items-center gap-2 rounded-2xl bg-rose-600 px-6 font-black text-white"><Mic className="h-6 w-6" />{recorder.audioUrl ? "Record again" : "Start recording"}</button> : <button type="button" onClick={recorder.stop} className="inline-flex min-h-14 items-center gap-2 rounded-2xl bg-rose-600 px-6 font-black text-white"><Square className="h-5 w-5" />Stop · {recorder.duration}s</button>}{recorder.audioUrl ? <><audio controls src={recorder.audioUrl} className="max-w-full" /><button type="button" onClick={onKeep} className="min-h-14 rounded-2xl bg-emerald-600 px-5 font-black text-white">Keep it</button></> : null}</div>{recorder.error ? <p className="mt-3 text-center font-bold text-rose-800">{recorder.error}</p> : null}</div>;
}

export function Grade4Session3Pilot({ pilotMode = false, initialRun = null }: { pilotMode?: boolean; initialRun?: Session3CourseRunRecord | null }) {
  const restored = initialRun?.state;
  const restoredStageIndex = restored ? STAGES.findIndex((item) => item.id === restored.activeStageId) : -1;
  const [started, setStarted] = useState(false);
  const [stageIndex, setStageIndex] = useState(restoredStageIndex >= 0 ? restoredStageIndex : 0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [talking, setTalking] = useState(false);
  const [foundBadgeIds, setFoundBadgeIds] = useState<Session3ActivityId[]>(restored?.foundBadgeIds ?? []);
  const [favouriteActivityId, setFavouriteActivityId] = useState<Session3ActivityId | null>(restored?.favouriteActivityId ?? null);
  const [questionChunks, setQuestionChunks] = useState<string[]>(restored?.questionChunks ?? []);
  const [questionPractised, setQuestionPractised] = useState(restored?.questionPractised ?? false);
  const [visitedFriendIds, setVisitedFriendIds] = useState<Session3FriendId[]>(restored?.visitedFriendIds ?? []);
  const [activeFriendId, setActiveFriendId] = useState<Session3FriendId | null>(null);
  const [responsePlayed, setResponsePlayed] = useState(false);
  const [heardAnswer, setHeardAnswer] = useState<"yes" | "no" | null>(null);
  const [chatMessage, setChatMessage] = useState<string | null>(null);
  const [chosenFriendId, setChosenFriendId] = useState<Session3FriendId | null>(restored?.chosenFriendId ?? null);
  const [matchMessage, setMatchMessage] = useState<string | null>(null);
  const [commonSentenceReady, setCommonSentenceReady] = useState(restored?.commonSentenceReady ?? false);
  const [commonSentencePractised, setCommonSentencePractised] = useState(restored?.commonSentencePractised ?? false);
  const [checkIndex, setCheckIndex] = useState(restored?.checkIndex ?? 0);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);
  const [reflection, setReflection] = useState<string | null>(restored?.reflection ?? null);
  const recorder = useLocalAudioRecorder();
  const { play: playLine, stop: stopAudio } = useSingleChannelLessonAudio({ enabled: soundEnabled, onPlayingChange: setTalking });
  const stage = STAGES[stageIndex];
  const favourite = SESSION_3_ACTIVITIES.find((item) => item.id === favouriteActivityId) ?? null;
  const activeFriend = SESSION_3_FRIENDS.find((item) => item.id === activeFriendId) ?? null;
  const matchingFriend = SESSION_3_FRIENDS.find((item) => item.activityId === favouriteActivityId) ?? null;
  const currentCheck = SESSION_3_CHECKS[checkIndex] ?? null;
  const questionBuilt = questionChunks.join(" ") === "Do you like";
  const progress = Math.round(((stageIndex + 1) / STAGES.length) * 100);

  const playDialogue = useCallback((id: Session3DialogueId) => {
    const clip = SESSION_3_DIALOGUE[id];
    playLine(clip.text, 0.88, clip.audioUrl, clip.playbackRate);
  }, [playLine]);

  useEffect(() => {
    if (!started || !stage) return;
    const audioId = stage.id === "common" && favourite ? COMMON_AUDIO[favourite.id] : stage.audioId;
    if (!audioId) return;
    const timer = window.setTimeout(() => playDialogue(audioId), 300);
    return () => window.clearTimeout(timer);
  }, [favourite, playDialogue, stage, started]);

  useEffect(() => {
    if (!started || stage.id !== "check" || !currentCheck) return;
    const audioId = CHECK_AUDIO[checkIndex];
    if (!audioId) return;
    const timer = window.setTimeout(() => playDialogue(audioId), checkIndex === 0 ? 2200 : 650);
    return () => window.clearTimeout(timer);
  }, [checkIndex, currentCheck, playDialogue, stage.id, started]);

  const runProgress = useMemo(() => ({ activeStageId: stage.id, foundBadgeIds, favouriteActivityId, questionChunks, questionPractised, visitedFriendIds, chosenFriendId, commonSentenceReady, commonSentencePractised, checkIndex, reflection, activePracticeActivityId: restored?.activePracticeActivityId ?? null, completedPracticeActivityIds: restored?.completedPracticeActivityIds ?? [], writingDraft: restored?.writingDraft ?? "" }), [checkIndex, chosenFriendId, commonSentencePractised, commonSentenceReady, favouriteActivityId, foundBadgeIds, questionChunks, questionPractised, reflection, restored?.activePracticeActivityId, restored?.completedPracticeActivityIds, restored?.writingDraft, stage.id, visitedFriendIds]);
  const saveState = useGrade4Session3Autosave({ enabled: !pilotMode, status: reflection ? "completed" : "in_progress", activeStepId: stage.id, progress: runProgress });

  function advance() { stopAudio(); recorder.clear(); setStageIndex((index) => Math.min(STAGES.length - 1, index + 1)); }
  function chooseFavourite(id: Session3ActivityId) { setFavouriteActivityId(id); setQuestionChunks([]); setVisitedFriendIds([]); setChosenFriendId(null); playDialogue("s3-favourite-confirm"); }
  function openFriend(friend: Session3Friend) { setActiveFriendId(friend.id); setResponsePlayed(false); setHeardAnswer(null); setChatMessage(null); playDialogue(`s3-ask-${friend.id}` as Session3DialogueId); }
  function askFriend() {
    if (!activeFriend || !favourite) return;
    setResponsePlayed(true);
    const answer = activeFriend.activityId === favourite.id ? "yes" : "no";
    playDialogue(`s3-${activeFriend.id}-${favourite.id}-${answer}` as Session3DialogueId);
  }
  function answerHeard(answer: "yes" | "no") {
    if (!activeFriend || !favourite) return;
    const correct = activeFriend.activityId === favourite.id ? "yes" : "no";
    if (answer !== correct) { setChatMessage("Listen once more and watch the activity badge."); askFriend(); return; }
    setHeardAnswer(answer); setChatMessage(answer === "yes" ? "You heard yes! Choose a friendly reaction." : "You heard no. Choose a friendly reaction."); playDialogue(answer === "yes" ? "s3-react-yes" : "s3-react-no");
  }
  function finishChat() {
    if (!activeFriend || !heardAnswer) return;
    setVisitedFriendIds((ids) => { const updated = ids.includes(activeFriend.id) ? ids : [...ids, activeFriend.id]; if (updated.length === 3) window.setTimeout(() => playDialogue("s3-all-chats"), 500); return updated; });
    setActiveFriendId(null); setResponsePlayed(false); setHeardAnswer(null); setChatMessage(null);
  }
  function chooseMatch(friend: Session3Friend) {
    if (!matchingFriend || friend.id !== matchingFriend.id) { setMatchMessage("Try the friend who said: Yes, I do!"); playDialogue("s3-match-intro"); return; }
    setChosenFriendId(friend.id); setMatchMessage(`${friend.name} shares your favourite!`); playDialogue(COMMON_AUDIO[friend.activityId]);
  }
  function answerCheck(answer: string) {
    if (!currentCheck) return;
    if (answer !== currentCheck.answer) { setCheckMessage(currentCheck.hint); playDialogue("s3-check-retry"); return; }
    setCheckMessage("Common-ground clue collected!"); playDialogue("s3-check-correct");
    window.setTimeout(() => { setCheckIndex((index) => index + 1); setCheckMessage(null); if (checkIndex === 2) playDialogue("s3-check-complete"); }, 650);
  }

  if (!stage) return null;
  if (!started) {
    return (
      <main className="relative min-h-dvh overflow-hidden bg-violet-950 text-white">
        <FriendshipCircleScene />
        <div className="absolute inset-0 bg-violet-950/75" />
        <div className={`absolute -left-[18vmax] -top-[18vmax] h-[55vmax] w-[55vmax] rounded-full opacity-50 ${styles.spiral}`} />
        <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-5 text-center">
          <div className="relative h-56 w-52 sm:h-72 sm:w-64"><Image src={POSES.hello} alt="Keelan waving" fill priority className={`object-contain ${styles.keelanIdle}`} unoptimized /></div>
          <p className="mt-2 text-sm font-black uppercase tracking-[.22em] text-amber-300">Unit 1 · Session 3</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-6xl">Find Something in Common</h1>
          <p className="mt-3 text-lg font-bold text-violet-100">Ask. Listen. Connect.</p>
          {restored ? <p className="mt-3 rounded-full bg-white/10 px-4 py-2 text-sm font-black">Your Friendship Circle progress is ready.</p> : null}
          <button type="button" onClick={() => { unlockSpeechSynthesis(); setStarted(true); }} className={`mt-7 flex h-24 w-24 items-center justify-center rounded-full bg-amber-300 text-violet-950 shadow-2xl ring-8 ring-white/30 transition hover:scale-110 sm:h-28 sm:w-28 ${styles.playPulse}`} aria-label="Start Session 3"><MousePointer2 className="h-12 w-12 fill-violet-950" /></button>
          <p className="mt-5 text-sm font-black text-white/80">Tap to begin</p>
          <p className="mt-2 text-[11px] font-bold text-white/55">Character voices are AI-generated.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-slate-950 text-slate-950">
      <FriendshipCircleScene />
      <div className="absolute inset-0 bg-[#180d35]/70" />
      <header className="absolute inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5">
        <div className="mx-auto flex max-w-7xl items-center gap-3 rounded-2xl border border-white/20 bg-violet-950/90 px-3 py-2 text-white shadow-xl backdrop-blur">
          <Link href={pilotMode ? "/pilots/grade-4-learning-paths" : "/primary/learn/grade-4"} className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-[.14em] text-violet-200">
              <span>Session 3 · Find Something in Common</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-amber-300 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
          {!pilotMode ? <span className="text-[10px] font-black text-violet-200">{saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Save paused" : ""}</span> : null}
          <button type="button" onClick={() => { setSoundEnabled((value) => !value); if (soundEnabled) stopAudio(); }} className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10" aria-label={soundEnabled ? "Turn sound off" : "Turn sound on"}><Volume2 className={`h-5 w-5 ${soundEnabled ? "" : "opacity-40"}`} /></button>
        </div>
      </header>

      <div className="relative z-10 mx-auto grid min-h-dvh max-w-7xl items-end gap-3 px-3 pb-3 pt-24 sm:px-5 lg:grid-cols-[19rem_minmax(0,1fr)] lg:items-center lg:gap-6 lg:pb-6">
        <aside className="pointer-events-none flex items-end justify-center lg:h-[72vh]"><div className="relative h-44 w-40 sm:h-56 sm:w-52 lg:h-full lg:w-full"><Image src={POSES[stage.pose]} alt="Keelan guiding the lesson" fill className={`object-contain object-bottom ${talking ? styles.keelanTalking : styles.keelanIdle}`} unoptimized /></div></aside>
        <section className="max-h-[76vh] overflow-y-auto rounded-[2rem] border-4 border-white/80 bg-white/95 p-4 shadow-2xl backdrop-blur sm:p-6">
          <div className="flex items-start gap-3"><div className="min-w-0 flex-1"><p className="text-xs font-black uppercase tracking-[.16em] text-violet-600">{stage.eyebrow}</p><p className="mt-1 text-xl font-black sm:text-3xl">{stage.helper}</p></div>{stage.audioId ? <button type="button" onClick={() => playDialogue(stage.audioId as Session3DialogueId)} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-700 text-white" aria-label="Hear Keelan"><Volume2 className="h-6 w-6" /></button> : null}</div>

          {stage.id === "mission" ? (
            <div className="mt-6"><div className="grid grid-cols-3 gap-3">{SESSION_3_ACTIVITIES.map((activity) => { const found = foundBadgeIds.includes(activity.id); return <button key={activity.id} type="button" onClick={() => { setFoundBadgeIds((ids) => { const updated = ids.includes(activity.id) ? ids : [...ids, activity.id]; playDialogue(updated.length === 3 ? "s3-badges-ready" : BADGE_AUDIO[activity.id]); return updated; }); }} className={`min-h-32 rounded-3xl border-4 bg-gradient-to-br p-3 text-center transition hover:-translate-y-1 ${activity.colour} ${found ? "border-emerald-500" : "border-amber-300"}`}><span className="text-5xl">{activity.icon}</span><span className="mt-2 block text-sm font-black sm:text-lg">{activity.label}</span>{found ? <Check className="mx-auto mt-1 h-6 w-6 text-emerald-700" /> : null}</button>; })}</div><div className="mt-6 text-center"><BigButton onClick={advance} disabled={foundBadgeIds.length !== 3}>Choose my favourite <ChevronRight className="h-6 w-6" /></BigButton></div></div>
          ) : null}

          {stage.id === "favourite" ? (
            <div className="mt-6"><div className="grid gap-3 sm:grid-cols-3">{SESSION_3_ACTIVITIES.map((activity) => <button key={activity.id} type="button" onClick={() => chooseFavourite(activity.id)} className={`min-h-36 rounded-3xl border-4 bg-gradient-to-br p-4 text-center transition hover:-translate-y-1 ${activity.colour} ${favouriteActivityId === activity.id ? "border-violet-700 ring-4 ring-violet-200" : "border-white"}`}><span className="text-5xl">{activity.icon}</span><span className="mt-2 block text-xl font-black">{activity.label}</span></button>)}</div><div className="mt-6 text-center"><BigButton onClick={advance} disabled={!favourite}>Build my question <ChevronRight className="h-6 w-6" /></BigButton></div></div>
          ) : null}

          {stage.id === "question" && favourite ? (
            <div className="mt-6 text-center">
              <div className="flex min-h-24 flex-wrap items-center justify-center gap-2 rounded-3xl bg-violet-100 p-4 text-2xl font-black"><span>{questionChunks[0] ?? "___"}</span><span>{questionChunks[1] ?? "___"}</span><span className="rounded-xl bg-amber-200 px-3 py-2">{favourite.phrase}?</span></div>
              <div className="mt-4 flex flex-wrap justify-center gap-3">{["you like", "Do"].filter((chunk) => !questionChunks.includes(chunk)).map((chunk) => <button key={chunk} type="button" onClick={() => { const next = [...questionChunks, chunk]; setQuestionChunks(next); if (next.join(" ") === "Do you like") playDialogue("s3-question-success"); }} className="min-h-14 rounded-2xl bg-sky-100 px-6 text-xl font-black text-sky-950">{chunk}</button>)}<button type="button" onClick={() => setQuestionChunks([])} className="flex h-14 w-14 items-center justify-center rounded-2xl border-3 border-violet-200"><RotateCcw className="h-5 w-5" /></button></div>
              {questionBuilt ? <RecordPanel recorder={recorder} model={() => playDialogue(QUESTION_AUDIO[favourite.id])} onStart={() => { playDialogue("s3-record-question"); void recorder.start("session-3-question"); }} onKeep={() => { setQuestionPractised(true); playDialogue("s3-recording-ready"); }} /> : <p className="mt-4 rounded-xl bg-amber-100 p-3 font-black text-amber-900">Start with <strong>Do</strong>.</p>}
              <div className="mt-6"><BigButton onClick={advance} disabled={!questionBuilt || (!questionPractised && !recorder.error)}>Ask my friends <ChevronRight className="h-6 w-6" /></BigButton></div>
            </div>
          ) : null}

          {stage.id === "chats" && favourite ? (
            <div className="mt-6">
              <div className="grid grid-cols-3 gap-3">{SESSION_3_FRIENDS.map((friend) => <FriendCard key={friend.id} friend={friend} visited={visitedFriendIds.includes(friend.id)} selected={activeFriendId === friend.id} onClick={() => openFriend(friend)} />)}</div>
              {activeFriend ? (
                <div className="mt-5 rounded-3xl border-3 border-sky-200 bg-sky-50 p-5 text-center">
                  <p className="text-2xl font-black">Ask {activeFriend.name}</p>
                  <p className="mt-2 text-lg font-bold">Do you like {favourite.phrase}?</p>
                  <button type="button" onClick={askFriend} className={`mt-4 inline-flex min-h-16 items-center gap-2 rounded-2xl bg-sky-600 px-7 text-lg font-black text-white ${styles.playPulse}`}><Volume2 className="h-6 w-6" />Ask and listen</button>
                  {responsePlayed ? <div className="mt-5 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => answerHeard("yes")} className="min-h-16 rounded-2xl bg-emerald-100 text-xl font-black text-emerald-950">Yes, I do.</button><button type="button" onClick={() => answerHeard("no")} className="min-h-16 rounded-2xl bg-rose-100 text-xl font-black text-rose-950">No, I don’t.</button></div> : null}
                  {chatMessage ? <p className="mt-4 rounded-xl bg-white p-3 font-black">{chatMessage}</p> : null}
                  {heardAnswer ? <button type="button" onClick={finishChat} className="mt-4 min-h-14 rounded-2xl bg-violet-700 px-7 text-lg font-black text-white">{heardAnswer === "yes" ? "Me too! 🙌" : "That’s okay 🙂"}</button> : null}
                </div>
              ) : null}
              <div className="mt-6 text-center"><BigButton onClick={advance} disabled={visitedFriendIds.length !== 3}>Find my match <ChevronRight className="h-6 w-6" /></BigButton></div>
            </div>
          ) : null}

          {stage.id === "match" && favourite ? (
            <div className="mt-6 text-center">
              <div className="mx-auto mb-5 flex max-w-sm items-center justify-center gap-3 rounded-3xl bg-amber-100 p-4"><span className="text-5xl">{favourite.icon}</span><span className="text-xl font-black">I like {favourite.phrase}.</span></div>
              <div className="grid grid-cols-3 gap-3">{SESSION_3_FRIENDS.map((friend) => <FriendCard key={friend.id} friend={friend} selected={chosenFriendId === friend.id} onClick={() => chooseMatch(friend)} />)}</div>
              {matchMessage ? <p className="mt-4 rounded-xl bg-violet-100 p-3 text-lg font-black text-violet-900">{matchMessage}</p> : null}
              <div className="mt-6"><BigButton onClick={advance} disabled={!chosenFriendId}>Say what we share <ChevronRight className="h-6 w-6" /></BigButton></div>
            </div>
          ) : null}

          {stage.id === "common" && favourite && matchingFriend ? (
            <div className="mt-6 text-center">
              <div className="rounded-3xl bg-gradient-to-r from-amber-100 via-white to-violet-100 p-5">
                <div className="flex items-center justify-center gap-4 text-5xl"><span>🙂</span><span className="text-3xl">🤝</span><span>{matchingFriend.avatar}</span></div>
                <p className="mt-4 text-2xl font-black sm:text-4xl">We <button type="button" onClick={() => { setCommonSentenceReady(true); playDialogue(COMMON_AUDIO[favourite.id]); }} className={`rounded-xl px-3 py-1 ${commonSentenceReady ? "bg-emerald-300" : "bg-amber-200 ring-4 ring-amber-300"}`}>{commonSentenceReady ? "both" : "___"}</button> like {favourite.phrase}.</p>
              </div>
              {commonSentenceReady ? <RecordPanel recorder={recorder} model={() => playDialogue(COMMON_AUDIO[favourite.id])} onStart={() => { playDialogue("s3-record-common"); void recorder.start("session-3-common-ground"); }} onKeep={() => { setCommonSentencePractised(true); playDialogue("s3-common-ready"); }} /> : <p className="mt-4 font-black text-violet-800">Tap the glowing word.</p>}
              <div className="mt-6"><BigButton onClick={advance} disabled={!commonSentenceReady || (!commonSentencePractised && !recorder.error)}>Try the clue check <ChevronRight className="h-6 w-6" /></BigButton></div>
            </div>
          ) : null}

          {stage.id === "check" ? (
            <div className="mt-6">
              {currentCheck ? (
                <div className="rounded-3xl border-4 border-amber-300 bg-amber-50 p-5">
                  <div className="flex items-center justify-between"><span className="rounded-full bg-violet-700 px-3 py-1 text-xs font-black text-white">CLUE {checkIndex + 1} OF 3</span><button type="button" onClick={() => playDialogue(CHECK_AUDIO[checkIndex])} className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-violet-700"><Volume2 className="h-5 w-5" /></button></div>
                  <p className="mt-4 text-2xl font-black sm:text-4xl">{currentCheck.prompt}</p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">{currentCheck.options.map((option) => <button type="button" key={option} onClick={() => answerCheck(option)} className="min-h-20 rounded-2xl border-3 border-violet-200 bg-white px-4 text-lg font-black transition hover:-translate-y-1 hover:border-violet-600">{option}</button>)}</div>
                  {checkMessage ? <p className="mt-4 rounded-xl bg-white p-3 text-center font-black">{checkMessage}</p> : null}
                </div>
              ) : (
                <div className={`rounded-3xl bg-emerald-100 p-7 text-center ${styles.rewardPop}`}><Sparkles className="mx-auto h-12 w-12 text-emerald-700" /><p className="mt-2 text-3xl font-black text-emerald-950">Friendship Circle open!</p><div className="mt-5"><BigButton onClick={advance}>Finish my mission <ChevronRight className="h-6 w-6" /></BigButton></div></div>
              )}
            </div>
          ) : null}

          {stage.id === "reflect" ? (
            <div className="mt-6 text-center">
              <div className="mx-auto flex max-w-lg items-center justify-center gap-2 rounded-3xl bg-amber-100 p-5 text-amber-900"><Star className="h-10 w-10 fill-amber-400" /><Heart className="h-14 w-14 fill-rose-400 text-rose-400" /><Star className="h-10 w-10 fill-amber-400" /></div>
              <p className="mt-5 text-xl font-black">Which friendship power helped most?</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">{[{ icon: "❓", label: "I can ask" }, { icon: "👂", label: "I can listen" }, { icon: "🤝", label: "I can connect" }].map((item) => <button type="button" key={item.label} onClick={() => { setReflection(item.label); playDialogue("s3-complete"); }} className={`min-h-28 rounded-3xl border-4 p-4 text-xl font-black transition hover:-translate-y-1 ${reflection === item.label ? "border-violet-700 bg-violet-700 text-white" : "border-violet-200 bg-white"}`}><span className="block text-4xl">{item.icon}</span>{item.label}</button>)}</div>
              {reflection ? <p className="mt-4 rounded-2xl bg-emerald-100 p-4 text-lg font-black text-emerald-900">Power saved: {reflection}</p> : null}
              <div className="mt-5 flex flex-wrap justify-center gap-3"><Link onClick={() => playDialogue("s3-practice-invite")} href={pilotMode ? "/pilots/grade-4-learning-paths/unit-1/session-3/practice" : "/primary/learn/grade-4/unit-1/session-3/practice"} className={`inline-flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-violet-700 to-fuchsia-600 px-7 text-lg font-black text-white shadow-xl ring-4 ring-violet-200 transition hover:scale-[1.03] ${reflection ? styles.playPulse : "pointer-events-none opacity-40"}`}>Play practice games <ChevronRight className="h-6 w-6" /></Link><Link href={pilotMode ? "/pilots/grade-4-learning-paths" : "/primary/learn/grade-4"} className="inline-flex min-h-14 items-center rounded-2xl border-3 border-violet-200 bg-white px-5 font-black">Back to Unit 1</Link></div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
