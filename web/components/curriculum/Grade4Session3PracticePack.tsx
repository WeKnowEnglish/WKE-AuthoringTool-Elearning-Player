"use client";

import Link from "next/link";
import { ArrowLeft, Check, ChevronRight, RotateCcw, Sparkles, Volume2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import { useSingleChannelLessonAudio } from "@/lib/audio/use-single-channel-lesson-audio";
import {
  normalizeSession3Sentence,
  SESSION_3_FIXES,
  SESSION_3_GRAMMAR_ITEMS,
  SESSION_3_PRACTICE_ACTIVITIES,
  SESSION_3_READING,
  SESSION_3_SCRAMBLES,
  SESSION_3_VOCABULARY,
  SESSION_3_WRITING_PROMPT,
  type Session3PracticeActivityId,
} from "@/lib/curriculum/session-3";
import { SESSION_3_DIALOGUE, type Session3DialogueId } from "@/lib/curriculum/session-3-dialogue.generated";
import type { Session3CourseRunRecord } from "@/lib/curriculum/session-3-run";
import { useGrade4Session3Autosave } from "@/lib/curriculum/use-session-3-run-autosave";
import styles from "./Grade4Session1Pilot.module.css";

const LISTEN_ITEMS: Array<{ audioId: Session3DialogueId; prompt: string; answer: "Yes" | "No" }> = [
  { audioId: "s3-mia-football-no", prompt: "Does Mia like playing football?", answer: "No" },
  { audioId: "s3-leo-football-yes", prompt: "Does Leo like playing football?", answer: "Yes" },
  { audioId: "s3-sam-football-no", prompt: "Does Sam like playing football?", answer: "No" },
];

function ActionButton({ children, onClick, disabled = false }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-violet-700 px-6 font-black text-white shadow-lg transition hover:scale-[1.02] disabled:opacity-40 ${!disabled ? styles.playPulse : ""}`}>{children}</button>;
}

export function Grade4Session3PracticePack({ pilotMode = false, initialRun = null }: { pilotMode?: boolean; initialRun?: Session3CourseRunRecord | null }) {
  const restored = initialRun?.state;
  const [activeId, setActiveId] = useState<Session3PracticeActivityId>(restored?.activePracticeActivityId ?? "vocabulary");
  const [completedIds, setCompletedIds] = useState<Session3PracticeActivityId[]>(restored?.completedPracticeActivityIds ?? []);
  const [writingDraft, setWritingDraft] = useState(restored?.writingDraft ?? "");
  const [vocabIndex, setVocabIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [seenCards, setSeenCards] = useState<number[]>([]);
  const [scrambleIndex, setScrambleIndex] = useState(0);
  const [builtChunks, setBuiltChunks] = useState<string[]>([]);
  const [scrambleMessage, setScrambleMessage] = useState<string | null>(null);
  const [listenIndex, setListenIndex] = useState(0);
  const [listenMessage, setListenMessage] = useState<string | null>(null);
  const [grammarIndex, setGrammarIndex] = useState(0);
  const [grammarMessage, setGrammarMessage] = useState<string | null>(null);
  const [fixIndex, setFixIndex] = useState(0);
  const [fixDraft, setFixDraft] = useState("");
  const [fixMessage, setFixMessage] = useState<string | null>(null);
  const [readIndex, setReadIndex] = useState(0);
  const [readMessage, setReadMessage] = useState<string | null>(null);
  const { play: playLine } = useSingleChannelLessonAudio();

  const active = SESSION_3_PRACTICE_ACTIVITIES.find((item) => item.id === activeId) ?? SESSION_3_PRACTICE_ACTIVITIES[0];
  const progress = Math.round((completedIds.length / SESSION_3_PRACTICE_ACTIVITIES.length) * 100);
  const wordCount = writingDraft.trim() ? writingDraft.trim().split(/\s+/).length : 0;
  const restoredAdventure = restored ?? { activeStageId: "reflect", foundBadgeIds: [], favouriteActivityId: null, questionChunks: [], questionPractised: false, visitedFriendIds: [], chosenFriendId: null, commonSentenceReady: false, commonSentencePractised: false, checkIndex: 0, reflection: null, activePracticeActivityId: null, completedPracticeActivityIds: [], writingDraft: "" };
  const runProgress = useMemo(() => ({ ...restoredAdventure, activeStageId: "practice", activePracticeActivityId: activeId, completedPracticeActivityIds: completedIds, writingDraft }), [activeId, completedIds, restoredAdventure, writingDraft]);
  const saveState = useGrade4Session3Autosave({ enabled: !pilotMode, status: completedIds.length === 7 ? "completed" : "in_progress", activeStepId: `practice:${activeId}`, progress: runProgress });

  const playDialogue = (id: Session3DialogueId) => { const clip = SESSION_3_DIALOGUE[id]; playLine(clip.text, 0.86, clip.audioUrl, clip.playbackRate); };
  const complete = (id = activeId) => setCompletedIds((ids) => ids.includes(id) ? ids : [...ids, id]);
  const nextActivity = () => { const index = SESSION_3_PRACTICE_ACTIVITIES.findIndex((item) => item.id === activeId); setActiveId(SESSION_3_PRACTICE_ACTIVITIES[Math.min(6, index + 1)].id); };

  function chooseScramble(chunk: string) {
    const item = SESSION_3_SCRAMBLES[scrambleIndex];
    const next = [...builtChunks, chunk];
    setBuiltChunks(next); setScrambleMessage(null);
    if (next.length !== item.chunks.length) return;
    if (next.join(" ") !== item.answer) { setScrambleMessage("Good try. Find the question or sentence starter."); return; }
    setScrambleMessage("Built!"); playLine(item.answer, 0.8);
    window.setTimeout(() => { if (scrambleIndex === 3) complete("question-scramble"); else setScrambleIndex((index) => index + 1); setBuiltChunks([]); setScrambleMessage(null); }, 650);
  }
  function answerListen(answer: "Yes" | "No") {
    const item = LISTEN_ITEMS[listenIndex];
    if (answer !== item.answer) { setListenMessage("Listen for do or don’t."); playDialogue(item.audioId); return; }
    setListenMessage("You heard the short answer!");
    window.setTimeout(() => { if (listenIndex === 2) complete("listen-answer"); else setListenIndex((index) => index + 1); setListenMessage(null); }, 650);
  }
  function answerGrammar(answer: string) {
    const item = SESSION_3_GRAMMAR_ITEMS[grammarIndex];
    if (answer !== item.answer) { setGrammarMessage(item.support); return; }
    setGrammarMessage("That pattern fits!");
    window.setTimeout(() => { if (grammarIndex === 4) complete("grammar-focus"); else setGrammarIndex((index) => index + 1); setGrammarMessage(null); }, 600);
  }
  function checkFix() {
    const item = SESSION_3_FIXES[fixIndex];
    if (normalizeSession3Sentence(fixDraft) !== normalizeSession3Sentence(item.answer)) { setFixMessage(item.hint); return; }
    setFixMessage("Chat repaired!");
    window.setTimeout(() => { if (fixIndex === 2) complete("fix-chat"); else setFixIndex((index) => index + 1); setFixDraft(""); setFixMessage(null); }, 650);
  }
  function answerReading(answer: string) {
    const item = SESSION_3_READING.questions[readIndex];
    if (answer !== item.answer) { setReadMessage("Read that part once more."); return; }
    setReadMessage("Found it!");
    window.setTimeout(() => { if (readIndex === 2) complete("read-note"); else setReadIndex((index) => index + 1); setReadMessage(null); }, 600);
  }

  const currentScramble = SESSION_3_SCRAMBLES[scrambleIndex];
  const currentListen = LISTEN_ITEMS[listenIndex];
  const currentGrammar = SESSION_3_GRAMMAR_ITEMS[grammarIndex];
  const currentFix = SESSION_3_FIXES[fixIndex];
  const currentRead = SESSION_3_READING.questions[readIndex];

  return (
    <main className="min-h-dvh bg-gradient-to-br from-violet-100 via-white to-amber-50 px-3 py-4 text-slate-950 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-3xl bg-violet-950 p-4 text-white shadow-xl sm:p-5">
          <div className="flex items-center gap-3"><Link href={pilotMode ? "/pilots/grade-4-learning-paths/unit-1/session-3" : "/primary/learn/grade-4/unit-1/session-3"} className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10" aria-label="Back to Session 3"><ArrowLeft className="h-5 w-5" /></Link><div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[.16em] text-violet-200">Unit 1 · Session 3</p><h1 className="text-2xl font-black sm:text-4xl">Common-ground practice</h1></div>{!pilotMode ? <span className="text-[10px] font-black text-violet-200">{saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Save paused" : ""}</span> : null}</div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-amber-300 transition-all" style={{ width: `${progress}%` }} /></div>
        </header>

        <nav className="mt-4 flex gap-2 overflow-x-auto rounded-2xl bg-white p-2 shadow" aria-label="Practice activities">{SESSION_3_PRACTICE_ACTIVITIES.map((item, index) => <button key={item.id} type="button" onClick={() => setActiveId(item.id)} className={`min-h-14 shrink-0 rounded-xl px-4 text-sm font-black transition ${activeId === item.id ? "bg-violet-700 text-white" : completedIds.includes(item.id) ? "bg-emerald-100 text-emerald-900" : "bg-violet-50 text-violet-900"}`}><span className="mr-2">{completedIds.includes(item.id) ? "✓" : item.icon}</span>{index + 1}. {item.shortTitle}</button>)}</nav>

        <section className="mt-4 rounded-[2rem] border-3 border-violet-200 bg-white p-5 shadow-xl sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.15em] text-violet-600">{active.icon} Activity {SESSION_3_PRACTICE_ACTIVITIES.findIndex((item) => item.id === activeId) + 1} of 7</p><h2 className="mt-1 text-2xl font-black sm:text-4xl">{active.title}</h2><p className="mt-2 font-bold text-slate-600">{active.purpose}</p></div>{completedIds.includes(activeId) ? <span className="rounded-full bg-emerald-100 px-4 py-2 font-black text-emerald-800"><Check className="mr-1 inline h-5 w-5" />Complete</span> : null}</div>

          {activeId === "vocabulary" ? (
            <div className="mt-6 text-center"><p className="text-sm font-black text-violet-600">CARD {vocabIndex + 1} OF 6</p><button type="button" onClick={() => { setFlipped((value) => !value); setSeenCards((ids) => ids.includes(vocabIndex) ? ids : [...ids, vocabIndex]); }} className={`mx-auto mt-3 flex min-h-64 w-full max-w-xl flex-col items-center justify-center rounded-[2rem] border-4 p-7 shadow-lg transition ${flipped ? "border-emerald-400 bg-emerald-50" : "border-violet-300 bg-violet-50"}`}><span className="text-6xl">{SESSION_3_VOCABULARY[vocabIndex].icon}</span><span className="mt-5 text-2xl font-black sm:text-4xl">{flipped ? SESSION_3_VOCABULARY[vocabIndex].back : SESSION_3_VOCABULARY[vocabIndex].front}</span><span className="mt-4 text-sm font-black text-violet-600">Tap to flip</span></button><div className="mt-5 flex flex-wrap justify-center gap-3"><button type="button" onClick={() => { setVocabIndex((index) => Math.max(0, index - 1)); setFlipped(false); }} className="min-h-12 rounded-xl border-3 border-violet-200 px-4 font-black">Back</button><button type="button" onClick={() => { setVocabIndex((index) => Math.min(5, index + 1)); setFlipped(false); }} className="min-h-12 rounded-xl border-3 border-violet-200 px-4 font-black">Next</button><ActionButton onClick={() => complete("vocabulary")} disabled={seenCards.length !== 6}>Finish cards</ActionButton></div></div>
          ) : null}

          {activeId === "question-scramble" ? (
            <div className="mt-6 text-center"><p className="text-sm font-black text-violet-600">BUILD {scrambleIndex + 1} OF 4</p><div className="mt-3 flex min-h-24 flex-wrap items-center justify-center gap-2 rounded-3xl bg-violet-100 p-4 text-2xl font-black">{builtChunks.length ? builtChunks.map((chunk, index) => <span key={`${chunk}-${index}`} className="rounded-xl bg-white px-3 py-2">{chunk}</span>) : <span className="text-violet-400">Tap the chunks below</span>}</div><div className="mt-4 flex flex-wrap justify-center gap-3">{currentScramble.chunks.filter((chunk) => !builtChunks.includes(chunk)).map((chunk) => <button type="button" key={chunk} onClick={() => chooseScramble(chunk)} className="min-h-14 rounded-2xl bg-sky-100 px-5 text-lg font-black text-sky-950">{chunk}</button>)}<button type="button" onClick={() => { setBuiltChunks([]); setScrambleMessage(null); }} className="flex h-14 w-14 items-center justify-center rounded-2xl border-3 border-violet-200"><RotateCcw className="h-5 w-5" /></button></div>{scrambleMessage ? <p className="mt-4 rounded-xl bg-amber-100 p-3 font-black text-amber-900">{scrambleMessage}</p> : null}</div>
          ) : null}

          {activeId === "listen-answer" ? (
            <div className="mt-6 text-center"><p className="text-sm font-black text-violet-600">VOICE {listenIndex + 1} OF 3</p><button type="button" onClick={() => playDialogue(currentListen.audioId)} className={`mx-auto mt-3 flex h-24 w-24 items-center justify-center rounded-full bg-sky-500 text-white shadow-xl ring-8 ring-sky-100 ${styles.playPulse}`}><Volume2 className="h-12 w-12" /></button><p className="mt-5 text-2xl font-black">{currentListen.prompt}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => answerListen("Yes")} className="min-h-20 rounded-2xl bg-emerald-100 text-2xl font-black text-emerald-950">Yes</button><button type="button" onClick={() => answerListen("No")} className="min-h-20 rounded-2xl bg-rose-100 text-2xl font-black text-rose-950">No</button></div>{listenMessage ? <p className="mt-4 rounded-xl bg-sky-100 p-3 font-black">{listenMessage}</p> : null}</div>
          ) : null}

          {activeId === "grammar-focus" ? (
            <div className="mt-6 text-center"><p className="text-sm font-black text-violet-600">PATTERN {grammarIndex + 1} OF 5</p><p className="mt-4 text-2xl font-black sm:text-4xl">{currentGrammar.before} <span className="rounded-xl bg-amber-200 px-3 py-1">___</span> {currentGrammar.after}</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{currentGrammar.options.map((option) => <button type="button" key={option} onClick={() => answerGrammar(option)} className="min-h-20 rounded-2xl border-3 border-violet-200 bg-white text-2xl font-black hover:border-violet-700">{option}</button>)}</div>{grammarMessage ? <p className="mt-4 rounded-xl bg-amber-100 p-3 font-black text-amber-900">{grammarMessage}</p> : null}</div>
          ) : null}

          {activeId === "fix-chat" ? (
            <div className="mt-6"><p className="text-sm font-black text-violet-600">REPAIR {fixIndex + 1} OF 3</p><div className="mt-3 rounded-2xl bg-rose-100 p-4 text-2xl font-black text-rose-900">“{currentFix.incorrect}”</div><textarea value={fixDraft} onChange={(event) => setFixDraft(event.target.value)} placeholder="Write the repaired sentence" className="mt-4 min-h-28 w-full rounded-2xl border-3 border-violet-200 p-4 text-xl font-bold outline-none focus:border-violet-600" /><div className="mt-3 text-center"><ActionButton onClick={checkFix} disabled={!fixDraft.trim()}>Check my repair <Check className="h-5 w-5" /></ActionButton></div>{fixMessage ? <p className="mt-4 rounded-xl bg-amber-100 p-3 text-center font-black text-amber-900">{fixMessage}</p> : null}</div>
          ) : null}

          {activeId === "read-note" ? (
            <div className="mt-6 grid gap-5 lg:grid-cols-2"><article className="rounded-3xl border-3 border-violet-200 bg-violet-50 p-5"><p className="text-xs font-black uppercase tracking-[.14em] text-violet-600">{SESSION_3_READING.title}</p><p className="mt-3 text-xl font-bold leading-9">{SESSION_3_READING.text}</p></article><div><p className="text-sm font-black text-violet-600">QUESTION {readIndex + 1} OF 3</p><p className="mt-3 text-2xl font-black">{currentRead.prompt}</p><div className="mt-4 grid gap-3">{currentRead.options.map((option) => <button type="button" key={option} onClick={() => answerReading(option)} className="min-h-14 rounded-2xl border-3 border-violet-200 bg-white px-4 text-left text-lg font-black">{option}</button>)}</div>{readMessage ? <p className="mt-4 rounded-xl bg-amber-100 p-3 font-black text-amber-900">{readMessage}</p> : null}</div></div>
          ) : null}

          {activeId === "write-chat" ? (
            <div className="mt-6"><div className="rounded-3xl bg-amber-100 p-5"><h3 className="text-2xl font-black text-amber-950">{SESSION_3_WRITING_PROMPT.title}</h3><p className="mt-2 text-lg font-bold leading-7 text-amber-950">{SESSION_3_WRITING_PROMPT.prompt}</p><div className="mt-4 flex flex-wrap gap-2">{SESSION_3_WRITING_PROMPT.starters.map((starter) => <button type="button" key={starter} onClick={() => setWritingDraft((value) => `${value}${value.trim() ? "\n" : ""}${starter} `)} className="rounded-xl bg-white px-3 py-2 text-sm font-black text-violet-900">{starter}</button>)}</div></div><textarea value={writingDraft} onChange={(event) => setWritingDraft(event.target.value)} placeholder="Write your mini-chat here..." className="mt-4 min-h-56 w-full rounded-3xl border-3 border-violet-200 p-5 text-lg font-bold leading-8 outline-none focus:border-violet-600" /><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className={`font-black ${wordCount >= 20 ? "text-emerald-700" : "text-violet-700"}`}>{wordCount} / 20 words</p><ActionButton onClick={() => complete("write-chat")} disabled={wordCount < 20}>Save my chat <Check className="h-5 w-5" /></ActionButton></div></div>
          ) : null}

          {completedIds.includes(activeId) && activeId !== "write-chat" ? <div className="mt-7 text-center"><ActionButton onClick={nextActivity}>Next activity <ChevronRight className="h-5 w-5" /></ActionButton></div> : null}
          {completedIds.length === 7 ? <div className={`mt-7 rounded-3xl bg-emerald-100 p-6 text-center ${styles.rewardPop}`}><Sparkles className="mx-auto h-12 w-12 text-emerald-700" /><p className="mt-2 text-3xl font-black text-emerald-950">All Session 3 power-ups complete!</p><Link href={pilotMode ? "/pilots/grade-4-learning-paths" : "/primary/learn/grade-4"} className="mx-auto mt-5 inline-flex min-h-14 items-center gap-2 rounded-2xl bg-emerald-700 px-6 font-black text-white">Back to Unit 1 <ChevronRight className="h-5 w-5" /></Link></div> : null}
        </section>
      </div>
    </main>
  );
}
