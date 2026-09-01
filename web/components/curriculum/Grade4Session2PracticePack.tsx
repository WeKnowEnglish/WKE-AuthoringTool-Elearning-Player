"use client";

import Link from "next/link";
import { ArrowLeft, Check, ChevronRight, Lightbulb, RotateCcw, Sparkles, Volume2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import {
  normalizeSession2Sentence,
  SESSION_2_DIALOGUE_FIXES,
  SESSION_2_FRIENDS,
  SESSION_2_GRAMMAR_ITEMS,
  SESSION_2_PRACTICE_ACTIVITIES,
  SESSION_2_QUESTION_SCRAMBLES,
  SESSION_2_READING,
  SESSION_2_VOCABULARY,
  SESSION_2_WRITING_PROMPT,
  type Session2PracticeActivityId,
} from "@/lib/curriculum/session-2";
import { SESSION_2_DIALOGUE, type Session2DialogueId } from "@/lib/curriculum/session-2-dialogue.generated";
import type { Session2CourseRunRecord } from "@/lib/curriculum/session-2-run";
import { useGrade4Session2Autosave } from "@/lib/curriculum/use-session-2-run-autosave";
import { useSingleChannelLessonAudio } from "@/lib/audio/use-single-channel-lesson-audio";
import styles from "./Grade4Session1Pilot.module.css";

function ActionButton({ children, onClick, disabled = false }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-violet-700 px-6 text-base font-black text-white shadow-lg transition hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100 ${!disabled ? styles.playPulse : ""}`}>{children}</button>;
}

export function Grade4Session2PracticePack({ pilotMode = false, initialRun = null }: { pilotMode?: boolean; initialRun?: Session2CourseRunRecord | null }) {
  const restored = initialRun?.state;
  const [activeId, setActiveId] = useState<Session2PracticeActivityId>(restored?.activePracticeActivityId ?? "vocabulary");
  const [completedIds, setCompletedIds] = useState<Session2PracticeActivityId[]>(restored?.completedPracticeActivityIds ?? []);
  const [writingDraft, setWritingDraft] = useState(restored?.writingDraft ?? "");
  const [vocabIndex, setVocabIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [seenCards, setSeenCards] = useState<string[]>([]);
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

  const active = SESSION_2_PRACTICE_ACTIVITIES.find((item) => item.id === activeId) ?? SESSION_2_PRACTICE_ACTIVITIES[0];
  const progress = Math.round((completedIds.length / SESSION_2_PRACTICE_ACTIVITIES.length) * 100);
  const wordCount = writingDraft.trim() ? writingDraft.trim().split(/\s+/).length : 0;
  const restoredAdventure = restored ?? {
    activeStageId: "reflect",
    foundTokenIds: [], questionChunks: [], questionUsed: false, visitedFriendIds: [], chosenFriendId: null,
    introPronoun: null, introInterest: null, checkIndex: 0, reflection: null,
    activePracticeActivityId: null, completedPracticeActivityIds: [], writingDraft: "",
  };
  const runProgress = useMemo(() => ({ ...restoredAdventure, activeStageId: "practice", activePracticeActivityId: activeId, completedPracticeActivityIds: completedIds, writingDraft }), [activeId, completedIds, restoredAdventure, writingDraft]);
  const saveState = useGrade4Session2Autosave({ enabled: !pilotMode, status: completedIds.length === SESSION_2_PRACTICE_ACTIVITIES.length ? "completed" : "in_progress", activeStepId: `practice:${activeId}`, progress: runProgress });

  function playDialogue(id: Session2DialogueId) {
    const clip = SESSION_2_DIALOGUE[id];
    playLine(clip.text, 0.86, clip.audioUrl, clip.playbackRate);
  }

  function complete(id = activeId) {
    setCompletedIds((ids) => ids.includes(id) ? ids : [...ids, id]);
  }

  function nextActivity() {
    const index = SESSION_2_PRACTICE_ACTIVITIES.findIndex((item) => item.id === activeId);
    setActiveId(SESSION_2_PRACTICE_ACTIVITIES[Math.min(SESSION_2_PRACTICE_ACTIVITIES.length - 1, index + 1)].id);
  }

  function chooseScrambleChunk(chunk: string) {
    const item = SESSION_2_QUESTION_SCRAMBLES[scrambleIndex];
    const next = [...builtChunks, chunk];
    setBuiltChunks(next);
    setScrambleMessage(null);
    if (next.length !== item.chunks.length) return;
    if (next.join(" ") !== item.answer) {
      setScrambleMessage("Good try. Start with the question word.");
      return;
    }
    setScrambleMessage("Question built!");
    playLine(item.answer, 0.78);
    window.setTimeout(() => {
      if (scrambleIndex === SESSION_2_QUESTION_SCRAMBLES.length - 1) complete("question-scramble");
      else setScrambleIndex((index) => index + 1);
      setBuiltChunks([]);
      setScrambleMessage(null);
    }, 650);
  }

  function answerListen(friendId: string) {
    const friend = SESSION_2_FRIENDS[listenIndex];
    if (friendId !== friend.id) { setListenMessage(`Listen again for ${friend.visualAnchor}.`); playDialogue(`s2-${friend.id}-profile` as Session2DialogueId); return; }
    setListenMessage("You matched the voice and profile!");
    window.setTimeout(() => {
      if (listenIndex === SESSION_2_FRIENDS.length - 1) complete("listen-match");
      else setListenIndex((index) => index + 1);
      setListenMessage(null);
    }, 650);
  }

  function answerGrammar(answer: string) {
    const item = SESSION_2_GRAMMAR_ITEMS[grammarIndex];
    if (answer !== item.answer) { setGrammarMessage(item.support); return; }
    setGrammarMessage("That pattern fits!");
    window.setTimeout(() => {
      if (grammarIndex === SESSION_2_GRAMMAR_ITEMS.length - 1) complete("grammar-focus");
      else setGrammarIndex((index) => index + 1);
      setGrammarMessage(null);
    }, 600);
  }

  function checkFix() {
    const item = SESSION_2_DIALOGUE_FIXES[fixIndex];
    if (normalizeSession2Sentence(fixDraft) !== normalizeSession2Sentence(item.answer)) { setFixMessage(item.hint); return; }
    setFixMessage("Conversation repaired!");
    window.setTimeout(() => {
      if (fixIndex === SESSION_2_DIALOGUE_FIXES.length - 1) complete("fix-dialogue");
      else setFixIndex((index) => index + 1);
      setFixDraft(""); setFixMessage(null);
    }, 650);
  }

  function answerReading(answer: string) {
    const item = SESSION_2_READING.questions[readIndex];
    if (answer !== item.answer) { setReadMessage("Look back at Sam's card and find the matching sentence."); return; }
    setReadMessage("Detail found!");
    window.setTimeout(() => {
      if (readIndex === SESSION_2_READING.questions.length - 1) complete("read-profile");
      else setReadIndex((index) => index + 1);
      setReadMessage(null);
    }, 600);
  }

  const currentScramble = SESSION_2_QUESTION_SCRAMBLES[scrambleIndex];
  const remainingChunks = currentScramble.chunks.filter((chunk) => !builtChunks.includes(chunk));
  const currentFriend = SESSION_2_FRIENDS[listenIndex];
  const currentGrammar = SESSION_2_GRAMMAR_ITEMS[grammarIndex];
  const currentFix = SESSION_2_DIALOGUE_FIXES[fixIndex];
  const currentRead = SESSION_2_READING.questions[readIndex];

  return (
    <main className="min-h-dvh bg-gradient-to-b from-violet-100 via-fuchsia-50 to-amber-50 px-3 py-4 text-slate-950 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-[1.7rem] bg-violet-950 p-4 text-white shadow-xl sm:p-5">
          <div className="flex items-center gap-3"><Link href={pilotMode ? "/pilots/grade-4-learning-paths/unit-1/session-2" : "/primary/learn/grade-4/unit-1/session-2"} className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10"><ArrowLeft className="h-5 w-5" /></Link><div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[.16em] text-violet-200">Session 2 · Practice games</p><h1 className="truncate text-2xl font-black sm:text-3xl">Friend Finder Power-ups</h1><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full bg-gradient-to-r from-amber-300 to-emerald-300" style={{ width: `${progress}%` }} /></div></div><span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black">{pilotMode ? "PILOT" : saveState === "saving" ? "SAVING" : "SAVED"}</span></div>
        </header>

        <nav className="mt-3 flex gap-2 overflow-x-auto rounded-2xl border border-violet-200 bg-white p-2 shadow-sm" aria-label="Session 2 practice activities">{SESSION_2_PRACTICE_ACTIVITIES.map((item) => <button type="button" key={item.id} onClick={() => setActiveId(item.id)} className={`relative min-h-14 shrink-0 rounded-xl px-4 text-sm font-black ${activeId === item.id ? "bg-violet-700 text-white" : "bg-violet-50 text-violet-900"}`}><span className="mr-2 text-xl">{item.icon}</span>{item.shortTitle}{completedIds.includes(item.id) ? <Check className="ml-2 inline h-4 w-4 text-emerald-300" /> : null}</button>)}</nav>

        <section className="mt-3 rounded-[1.7rem] border-2 border-violet-200 bg-white p-4 shadow-xl sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.15em] text-violet-600">{active.icon} Supporting work</p><h2 className="mt-1 text-2xl font-black sm:text-3xl">{active.title}</h2><p className="mt-1 font-bold text-slate-600">{active.purpose}</p></div>{completedIds.includes(activeId) ? <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-black text-emerald-800"><Check className="mr-1 inline h-4 w-4" />Complete</span> : null}</div>

          {activeId === "vocabulary" ? <div className="mt-6 text-center"><button type="button" onClick={() => { setFlipped((value) => !value); if (!flipped) setSeenCards((ids) => ids.includes(SESSION_2_VOCABULARY[vocabIndex].id) ? ids : [...ids, SESSION_2_VOCABULARY[vocabIndex].id]); }} className={`mx-auto flex min-h-64 w-full max-w-xl flex-col items-center justify-center rounded-[2rem] border-4 p-6 shadow-lg transition ${flipped ? "border-emerald-400 bg-emerald-50" : "border-violet-300 bg-violet-50"}`}><span className="text-6xl">{SESSION_2_VOCABULARY[vocabIndex].icon}</span><span className="mt-4 text-3xl font-black">{flipped ? SESSION_2_VOCABULARY[vocabIndex].back : SESSION_2_VOCABULARY[vocabIndex].front}</span><span className="mt-4 text-sm font-black text-violet-600">Tap to flip</span></button><div className="mt-4 flex justify-center gap-3"><button type="button" onClick={() => { setVocabIndex((index) => Math.max(0, index - 1)); setFlipped(false); }} className="min-h-12 rounded-xl border-2 border-violet-200 px-4 font-black">Back</button><button type="button" onClick={() => { if (vocabIndex === SESSION_2_VOCABULARY.length - 1 && seenCards.length === SESSION_2_VOCABULARY.length) complete("vocabulary"); else setVocabIndex((index) => Math.min(SESSION_2_VOCABULARY.length - 1, index + 1)); setFlipped(false); }} className="min-h-12 rounded-xl bg-violet-700 px-5 font-black text-white">{vocabIndex === SESSION_2_VOCABULARY.length - 1 ? "Finish cards" : "Next card"}</button></div><p className="mt-2 text-sm font-bold text-slate-500">{seenCards.length}/{SESSION_2_VOCABULARY.length} cards flipped</p></div> : null}

          {activeId === "question-scramble" ? <div className="mt-6"><p className="text-center text-sm font-black text-violet-600">QUESTION {scrambleIndex + 1} OF {SESSION_2_QUESTION_SCRAMBLES.length}</p><div className="mt-3 flex min-h-24 flex-wrap items-center justify-center gap-3 rounded-3xl border-4 border-dashed border-violet-300 bg-violet-50 p-4">{builtChunks.map((chunk, index) => <button type="button" key={`${chunk}-${index}`} onClick={() => setBuiltChunks((chunks) => chunks.filter((_, itemIndex) => index !== itemIndex))} className="min-h-14 rounded-2xl bg-violet-700 px-5 text-xl font-black text-white">{chunk}</button>)}</div><div className="mt-4 flex flex-wrap justify-center gap-3">{remainingChunks.map((chunk) => <button type="button" key={chunk} onClick={() => chooseScrambleChunk(chunk)} className="min-h-14 rounded-2xl border-3 border-violet-300 bg-white px-5 text-xl font-black">{chunk}</button>)}</div>{scrambleMessage ? <p className="mt-4 rounded-xl bg-amber-100 p-3 text-center font-black text-amber-900">{scrambleMessage}</p> : null}{builtChunks.length === currentScramble.chunks.length && scrambleMessage ? <button type="button" onClick={() => { setBuiltChunks([]); setScrambleMessage(null); }} className="mx-auto mt-3 flex min-h-11 items-center gap-2 rounded-xl px-4 font-black text-violet-700"><RotateCcw className="h-4 w-4" />Try again</button> : null}</div> : null}

          {activeId === "listen-match" ? <div className="mt-6 text-center"><p className="text-sm font-black text-violet-600">VOICE {listenIndex + 1} OF 3</p><button type="button" onClick={() => playDialogue(`s2-${currentFriend.id}-profile` as Session2DialogueId)} className={`mx-auto mt-3 flex h-24 w-24 items-center justify-center rounded-full bg-sky-500 text-white shadow-xl ring-8 ring-sky-100 ${styles.playPulse}`}><Volume2 className="h-12 w-12" /></button><p className="mt-4 text-2xl font-black">Who is speaking?</p><div className="mt-4 grid grid-cols-3 gap-3">{SESSION_2_FRIENDS.map((friend) => <button type="button" key={friend.id} onClick={() => answerListen(friend.id)} className="min-h-28 rounded-2xl border-3 border-violet-200 bg-white p-3 text-xl font-black shadow-sm"><span className="block text-4xl">{friend.avatar}</span>{friend.name}</button>)}</div>{listenMessage ? <p className="mt-4 rounded-xl bg-sky-100 p-3 font-black text-sky-900">{listenMessage}</p> : null}</div> : null}

          {activeId === "grammar-focus" ? <div className="mt-6 rounded-3xl bg-fuchsia-50 p-5"><p className="text-sm font-black text-fuchsia-700">PATTERN {grammarIndex + 1} OF {SESSION_2_GRAMMAR_ITEMS.length}</p><p className="mt-4 text-center text-3xl font-black">{currentGrammar.before} <span className="rounded-xl bg-white px-3 py-1 text-violet-700">?</span> {currentGrammar.after}</p><div className="mx-auto mt-5 grid max-w-lg grid-cols-2 gap-3">{currentGrammar.options.map((option) => <button type="button" key={option} onClick={() => answerGrammar(option)} className="min-h-16 rounded-2xl border-3 border-fuchsia-200 bg-white text-xl font-black">{option}</button>)}</div>{grammarMessage ? <p className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-white p-3 font-black text-fuchsia-900"><Lightbulb className="h-5 w-5" />{grammarMessage}</p> : null}</div> : null}

          {activeId === "fix-dialogue" ? <div className="mt-6"><p className="text-sm font-black text-violet-600">REPAIR {fixIndex + 1} OF {SESSION_2_DIALOGUE_FIXES.length}</p><div className="mt-3 rounded-2xl bg-rose-100 p-4 text-2xl font-black text-rose-900">“{currentFix.incorrect}”</div><textarea value={fixDraft} onChange={(event) => setFixDraft(event.target.value)} placeholder="Write the repaired sentence" className="mt-4 min-h-28 w-full rounded-2xl border-3 border-violet-200 p-4 text-xl font-bold outline-none focus:border-violet-600" /><div className="mt-3 text-center"><ActionButton onClick={checkFix} disabled={!fixDraft.trim()}>Check my repair <Check className="h-5 w-5" /></ActionButton></div>{fixMessage ? <p className="mt-4 rounded-xl bg-amber-100 p-3 text-center font-black text-amber-900">{fixMessage}</p> : null}</div> : null}

          {activeId === "read-profile" ? <div className="mt-6 grid gap-5 lg:grid-cols-2"><article className="rounded-3xl border-3 border-violet-200 bg-violet-50 p-5"><p className="text-xs font-black uppercase tracking-[.14em] text-violet-600">{SESSION_2_READING.title}</p><p className="mt-3 text-xl font-bold leading-9">{SESSION_2_READING.text}</p><button type="button" onClick={() => playDialogue("s2-sam-profile")} className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-4 font-black text-violet-800"><Volume2 className="h-5 w-5" />Hear Sam</button></article><div><p className="text-sm font-black text-violet-600">QUESTION {readIndex + 1} OF 3</p><p className="mt-3 text-2xl font-black">{currentRead.prompt}</p><div className="mt-4 grid gap-3">{currentRead.options.map((option) => <button type="button" key={option} onClick={() => answerReading(option)} className="min-h-14 rounded-2xl border-3 border-violet-200 bg-white px-4 text-left text-lg font-black">{option}</button>)}</div>{readMessage ? <p className="mt-4 rounded-xl bg-amber-100 p-3 font-black text-amber-900">{readMessage}</p> : null}</div></div> : null}

          {activeId === "write-profile" ? <div className="mt-6"><div className="rounded-2xl bg-amber-100 p-4"><h3 className="text-xl font-black text-amber-950">{SESSION_2_WRITING_PROMPT.title}</h3><p className="mt-1 font-bold leading-6 text-amber-900">{SESSION_2_WRITING_PROMPT.prompt}</p></div><div className="mt-4 flex flex-wrap gap-2">{SESSION_2_WRITING_PROMPT.starters.map((starter) => <button type="button" key={starter} onClick={() => setWritingDraft((value) => `${value}${value.trim() ? " " : ""}${starter}`)} className="rounded-xl bg-violet-100 px-3 py-2 text-sm font-black text-violet-900">{starter}</button>)}</div><textarea value={writingDraft} onChange={(event) => setWritingDraft(event.target.value)} placeholder="This is my friend..." className="mt-4 min-h-48 w-full rounded-2xl border-3 border-violet-200 p-4 text-lg font-bold leading-7 outline-none focus:border-violet-600" /><div className="mt-2 flex items-center justify-between text-sm font-black"><span className={wordCount >= SESSION_2_WRITING_PROMPT.minimumWords ? "text-emerald-700" : "text-slate-500"}>{wordCount}/{SESSION_2_WRITING_PROMPT.minimumWords} words</span><span className="text-slate-500">{SESSION_2_WRITING_PROMPT.wordBank.join(" · ")}</span></div><div className="mt-4 text-center"><ActionButton onClick={() => complete("write-profile")} disabled={wordCount < SESSION_2_WRITING_PROMPT.minimumWords}>Save my friend card <Sparkles className="h-5 w-5" /></ActionButton></div></div> : null}

          {completedIds.includes(activeId) && activeId !== "write-profile" ? <div className="mt-6 flex justify-center"><ActionButton onClick={nextActivity}>Next power-up <ChevronRight className="h-5 w-5" /></ActionButton></div> : null}
          {completedIds.length === SESSION_2_PRACTICE_ACTIVITIES.length ? <div className={`mt-7 rounded-3xl bg-emerald-100 p-6 text-center ${styles.rewardPop}`}><Sparkles className="mx-auto h-12 w-12 text-emerald-700" /><p className="mt-2 text-3xl font-black text-emerald-950">All Session 2 power-ups complete!</p><Link href={pilotMode ? "/pilots/grade-4-learning-paths" : "/primary/learn/grade-4"} className="mx-auto mt-5 inline-flex min-h-14 items-center gap-2 rounded-2xl bg-emerald-700 px-6 font-black text-white">Back to Unit 1 <ChevronRight className="h-5 w-5" /></Link></div> : null}
        </section>
      </div>
    </main>
  );
}
