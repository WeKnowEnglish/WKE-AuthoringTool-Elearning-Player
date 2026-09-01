"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Home,
  Languages,
  ListChecks,
  PencilLine,
  RotateCcw,
  Shuffle,
  Sparkles,
  Volume2,
} from "lucide-react";
import type {
  CourseSessionRunRecord,
  Session1PracticeProgress,
} from "@/lib/curriculum/session-run";
import { useGrade4Session1Autosave } from "@/lib/curriculum/use-session-run-autosave";
import {
  SESSION_1_GRAMMAR_ITEMS,
  SESSION_1_LETTER_SCRAMBLES,
  SESSION_1_SENTENCE_FIXES,
  SESSION_1_VOCABULARY,
  SESSION_1_WRITING_PROMPT,
  normalizeSession1Sentence,
  type Session1PracticeActivityId,
} from "@/lib/curriculum/session-1-practice";

const ACTIVITIES: Array<{
  id: Session1PracticeActivityId;
  title: string;
  subtitle: string;
  minutes: number;
  color: string;
}> = [
  {
    id: "vocabulary",
    title: "Welcome Fair words",
    subtitle: "Look, listen, say, and reveal",
    minutes: 3,
    color: "from-sky-500 to-cyan-500",
  },
  {
    id: "letter-scramble",
    title: "Build the fair words",
    subtitle: "Put the letters in order",
    minutes: 3,
    color: "from-amber-500 to-orange-500",
  },
  {
    id: "grammar-focus",
    title: "Like or likes?",
    subtitle: "Notice the speaking pattern",
    minutes: 4,
    color: "from-violet-600 to-fuchsia-500",
  },
  {
    id: "fix-sentence",
    title: "Fix the sentence",
    subtitle: "Make each message clear",
    minutes: 4,
    color: "from-rose-500 to-pink-500",
  },
  {
    id: "free-writing",
    title: "My fair visit",
    subtitle: "Write your own response",
    minutes: 6,
    color: "from-emerald-600 to-teal-500",
  },
];

function ActivityIcon({ id, className = "h-7 w-7" }: { id: Session1PracticeActivityId; className?: string }) {
  if (id === "vocabulary") return <BookOpen className={className} />;
  if (id === "letter-scramble") return <Shuffle className={className} />;
  if (id === "grammar-focus") return <Languages className={className} />;
  if (id === "fix-sentence") return <ListChecks className={className} />;
  return <PencilLine className={className} />;
}

function PracticeStageShell({ active, completed, onNavigate, children }: { active: Session1PracticeActivityId; completed: Session1PracticeActivityId[]; onNavigate: (id: Session1PracticeActivityId | null) => void; children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-[linear-gradient(155deg,#171229_0%,#2d1b69_55%,#164e63_100%)] p-2 sm:p-4">
      <div className="mx-auto max-w-6xl">
        <nav className="mb-3 flex items-center gap-2 overflow-x-auto rounded-2xl border border-white/20 bg-white/95 p-2 shadow-xl" aria-label="Session 1 practice activities">
          <button type="button" onClick={() => onNavigate(null)} className="flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-slate-700" aria-label="All practice activities"><Home className="h-5 w-5" /></button>
          {ACTIVITIES.map((activity, index) => {
            const selected = activity.id === active;
            const done = completed.includes(activity.id);
            return <button key={activity.id} type="button" onClick={() => onNavigate(activity.id)} className={`flex min-h-12 min-w-36 shrink-0 items-center gap-2 rounded-xl border-2 px-3 text-left text-xs font-black transition ${selected ? "border-violet-700 bg-violet-700 text-white shadow-lg" : done ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-700"}`}><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${selected ? "bg-white/20" : done ? "bg-emerald-200" : "bg-slate-100"}`}>{done && !selected ? <Check className="h-4 w-4" /> : index + 1}</span><span className="truncate">{activity.title}</span></button>;
          })}
        </nav>
        {children}
      </div>
    </main>
  );
}

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-GB";
  utterance.rate = 0.85;
  window.speechSynthesis.speak(utterance);
}

function ActivityFrame({
  id,
  title,
  eyebrow,
  current,
  total,
  onBack,
  children,
}: {
  id: Session1PracticeActivityId;
  title: string;
  eyebrow: string;
  current: number;
  total: number;
  onBack: () => void;
  children: React.ReactNode;
}) {
  const progress = Math.round((current / total) * 100);
  return (
    <section className="overflow-hidden rounded-[1.75rem] border-4 border-white/80 bg-white shadow-2xl">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-slate-700"
          aria-label="Back to practice pack"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-800">
          <ActivityIcon id={id} className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-700">{eyebrow}</p>
          <h1 className="truncate text-xl font-black text-slate-950 sm:text-2xl">{title}</h1>
        </div>
        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-800">
          {current}/{total}
        </span>
        <div className="basis-full">
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-violet-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </header>
      <div className="min-h-[32rem] bg-[radial-gradient(circle_at_top,#f5f3ff_0%,#ffffff_56%)] p-4 sm:p-7">
        {children}
      </div>
    </section>
  );
}

function VocabularyCards({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const card = SESSION_1_VOCABULARY[index];

  function next() {
    if (index === SESSION_1_VOCABULARY.length - 1) {
      onComplete();
      return;
    }
    setIndex((value) => value + 1);
    setRevealed(false);
  }

  return (
    <ActivityFrame
      id="vocabulary"
      title="Welcome Fair words"
      eyebrow="Vocabulary cards"
      current={index + 1}
      total={SESSION_1_VOCABULARY.length}
      onBack={onBack}
    >
      <div className="mx-auto flex max-w-2xl flex-col items-center">
        <p className="text-center text-sm font-black text-slate-500">Look · Listen · Say</p>
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="mt-4 flex min-h-[21rem] w-full flex-col items-center justify-center rounded-[2rem] border-4 border-sky-300 bg-white p-6 text-center shadow-[0_18px_40px_rgba(14,165,233,0.18)] transition hover:-translate-y-1"
        >
          <span className="text-8xl sm:text-9xl" aria-hidden>{card.visual}</span>
          <span className="mt-5 text-4xl font-black text-slate-950 sm:text-5xl">{card.word}</span>
          {!revealed ? (
            <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-200 px-5 py-2 text-sm font-black text-amber-950">
              <Sparkles className="h-5 w-5 animate-pulse" /> Reveal
            </span>
          ) : (
            <span className="mt-5 max-w-lg">
              <span className="block text-lg font-bold text-slate-700">{card.meaning}</span>
              <span className="mt-3 block rounded-xl bg-sky-50 px-4 py-3 text-xl font-black text-sky-900">
                {card.example}
              </span>
            </span>
          )}
        </button>
        <div className="mt-4 flex w-full flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => speak(`${card.word}. ${card.example}`)}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-sky-200 bg-white px-5 text-sm font-black text-sky-800"
          >
            <Volume2 className="h-5 w-5" /> Listen
          </button>
          {revealed ? (
            <button
              type="button"
              onClick={next}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-sky-600 px-6 text-sm font-black text-white shadow-lg"
            >
              {index === SESSION_1_VOCABULARY.length - 1 ? "Finish cards" : "Next word"}
              <ChevronRight className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </div>
    </ActivityFrame>
  );
}

function LetterScramble({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [result, setResult] = useState<"ready" | "try" | "correct">("ready");
  const item = SESSION_1_LETTER_SCRAMBLES[index];
  const builtWord = selected.map((letterIndex) => item.letters[letterIndex]).join("");

  function removeLetter(letterIndex: number) {
    setSelected((current) => current.filter((value) => value !== letterIndex));
    setResult("ready");
  }

  function check() {
    setResult(builtWord === item.answer ? "correct" : "try");
  }

  function next() {
    if (index === SESSION_1_LETTER_SCRAMBLES.length - 1) {
      onComplete();
      return;
    }
    setIndex((value) => value + 1);
    setSelected([]);
    setResult("ready");
  }

  return (
    <ActivityFrame
      id="letter-scramble"
      title="Build the fair words"
      eyebrow="Letter scramble"
      current={index + 1}
      total={SESSION_1_LETTER_SCRAMBLES.length}
      onBack={onBack}
    >
      <div className="mx-auto max-w-3xl text-center">
        <span className="text-8xl" aria-hidden>{item.visual}</span>
        <div className="mt-5 flex min-h-20 flex-wrap items-center justify-center gap-2 rounded-2xl border-4 border-dashed border-amber-300 bg-white p-3">
          {selected.length === 0 ? (
            <PencilLine className="h-8 w-8 animate-bounce text-amber-500" aria-hidden />
          ) : (
            selected.map((letterIndex) => (
              <button
                key={letterIndex}
                type="button"
                onClick={() => removeLetter(letterIndex)}
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-2xl font-black uppercase text-white shadow"
              >
                {item.letters[letterIndex]}
              </button>
            ))
          )}
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {item.letters.map((letter, letterIndex) => (
            <button
              key={letterIndex}
              type="button"
              disabled={selected.includes(letterIndex) || result === "correct"}
              onClick={() => {
                setSelected((current) => [...current, letterIndex]);
                setResult("ready");
              }}
              className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-amber-700 bg-amber-100 text-2xl font-black uppercase text-amber-950 shadow-sm disabled:opacity-20"
            >
              {letter}
            </button>
          ))}
        </div>
        {result === "try" ? (
          <p className="mt-4 text-base font-black text-amber-800">Almost—tap a letter above to move it back.</p>
        ) : null}
        {result === "correct" ? (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-5 py-2 text-base font-black text-emerald-800">
            <CheckCircle2 className="h-5 w-5" /> You built {item.answer}!
          </p>
        ) : null}
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              setSelected([]);
              setResult("ready");
            }}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-5 text-sm font-black text-slate-700"
          >
            <RotateCcw className="h-4 w-4" /> Clear
          </button>
          {result === "correct" ? (
            <button type="button" onClick={next} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-amber-500 px-6 text-sm font-black text-amber-950 shadow-lg">
              {index === SESSION_1_LETTER_SCRAMBLES.length - 1 ? "Finish" : "Next word"} <ChevronRight className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={selected.length !== item.letters.length}
              onClick={check}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-amber-500 px-6 text-sm font-black text-amber-950 shadow-lg disabled:opacity-40"
            >
              <Check className="h-5 w-5" /> Check
            </button>
          )}
        </div>
      </div>
    </ActivityFrame>
  );
}

function GrammarFocus({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const item = SESSION_1_GRAMMAR_ITEMS[index];
  const correct = selected === item.answer;

  function next() {
    if (index === SESSION_1_GRAMMAR_ITEMS.length - 1) {
      onComplete();
      return;
    }
    setIndex((value) => value + 1);
    setSelected(null);
  }

  return (
    <ActivityFrame
      id="grammar-focus"
      title="Like or likes?"
      eyebrow="Grammar in focus"
      current={index + 1}
      total={SESSION_1_GRAMMAR_ITEMS.length}
      onBack={onBack}
    >
      <div className="mx-auto max-w-3xl text-center">
        <span className="text-8xl" aria-hidden>{item.visual}</span>
        <div className="mt-5 rounded-[1.75rem] border-4 border-violet-200 bg-white p-6 shadow-xl sm:p-9">
          <p className="text-2xl font-black leading-relaxed text-slate-950 sm:text-4xl">
            {item.before} <span className="inline-block min-w-28 border-b-4 border-violet-400 px-2 text-violet-700">{correct ? item.answer : "___"}</span> {item.after}
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {item.options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSelected(option)}
                className={`min-h-16 rounded-2xl border-4 px-5 text-2xl font-black transition ${selected === option ? (option === item.answer ? "border-emerald-500 bg-emerald-100 text-emerald-900" : "border-amber-400 bg-amber-100 text-amber-900") : "border-violet-200 bg-violet-50 text-violet-900 hover:border-violet-500"}`}
              >
                {option}
              </button>
            ))}
          </div>
          {selected && !correct ? (
            <p className="mt-5 rounded-xl bg-amber-100 px-4 py-3 text-base font-black text-amber-900">{item.support}</p>
          ) : null}
          {correct ? (
            <button type="button" onClick={next} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-violet-700 px-6 text-sm font-black text-white shadow-lg">
              {index === SESSION_1_GRAMMAR_ITEMS.length - 1 ? "Finish" : "Next sentence"} <ChevronRight className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </div>
    </ActivityFrame>
  );
}

function FixSentence({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState("");
  const [result, setResult] = useState<"ready" | "try" | "correct">("ready");
  const item = SESSION_1_SENTENCE_FIXES[index];

  function check() {
    setResult(normalizeSession1Sentence(value) === normalizeSession1Sentence(item.answer) ? "correct" : "try");
  }

  function next() {
    if (index === SESSION_1_SENTENCE_FIXES.length - 1) {
      onComplete();
      return;
    }
    setIndex((current) => current + 1);
    setValue("");
    setResult("ready");
  }

  return (
    <ActivityFrame
      id="fix-sentence"
      title="Fix the sentence"
      eyebrow="Sentence repair"
      current={index + 1}
      total={SESSION_1_SENTENCE_FIXES.length}
      onBack={onBack}
    >
      <div className="mx-auto max-w-3xl">
        <div className="text-center text-8xl" aria-hidden>{item.visual}</div>
        <div className="mt-5 rounded-[1.75rem] border-4 border-rose-200 bg-white p-5 shadow-xl sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-rose-600">This sentence needs help</p>
          <p className="mt-2 text-2xl font-black text-rose-700 line-through decoration-4 sm:text-4xl">{item.incorrect}</p>
          <label className="mt-7 block">
            <span className="text-sm font-black text-slate-700">Write the clear sentence</span>
            <input
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setResult("ready");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && value.trim()) check();
              }}
              className="mt-2 min-h-16 w-full rounded-2xl border-4 border-slate-200 bg-slate-50 px-4 text-xl font-black text-slate-950 outline-none focus:border-rose-400 sm:text-2xl"
              placeholder="Write the sentence here…"
              autoCapitalize="sentences"
            />
          </label>
          {result === "try" ? (
            <p className="mt-4 rounded-xl bg-amber-100 px-4 py-3 text-base font-black text-amber-900">{item.hint}</p>
          ) : null}
          {result === "correct" ? (
            <p className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-100 px-4 py-3 text-base font-black text-emerald-800">
              <CheckCircle2 className="h-5 w-5" /> Clear and correct!
            </p>
          ) : null}
          <div className="mt-5">
            {result === "correct" ? (
              <button type="button" onClick={next} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-rose-600 px-6 text-sm font-black text-white shadow-lg">
                {index === SESSION_1_SENTENCE_FIXES.length - 1 ? "Finish" : "Next sentence"} <ChevronRight className="h-5 w-5" />
              </button>
            ) : (
              <button type="button" disabled={!value.trim()} onClick={check} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-rose-600 px-6 text-sm font-black text-white shadow-lg disabled:opacity-40">
                <Check className="h-5 w-5" /> Check my sentence
              </button>
            )}
          </div>
        </div>
      </div>
    </ActivityFrame>
  );
}

function FreeWriting({
  draft,
  onDraftChange,
  onComplete,
  onBack,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  onComplete: () => void;
  onBack: () => void;
}) {
  const words = useMemo(() => draft.trim().split(/\s+/).filter(Boolean).length, [draft]);
  const ready = words >= SESSION_1_WRITING_PROMPT.minimumWords;

  function addWord(word: string) {
    onDraftChange(`${draft}${draft && !draft.endsWith(" ") ? " " : ""}${word} `);
  }

  return (
    <ActivityFrame
      id="free-writing"
      title="My fair visit"
      eyebrow="Free response"
      current={1}
      total={1}
      onBack={onBack}
    >
      <div className="mx-auto max-w-4xl">
        <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <aside className="rounded-[1.5rem] bg-emerald-700 p-5 text-white shadow-xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-100">{SESSION_1_WRITING_PROMPT.title}</p>
            <h2 className="mt-3 text-2xl font-black leading-8">{SESSION_1_WRITING_PROMPT.prompt}</h2>
            <div className="mt-5 space-y-2">
              {SESSION_1_WRITING_PROMPT.sentenceStarters.map((starter) => (
                <p key={starter} className="rounded-xl bg-white/15 px-3 py-2 text-sm font-bold">{starter}</p>
              ))}
            </div>
          </aside>
          <div className="rounded-[1.5rem] border-4 border-emerald-200 bg-white p-4 shadow-xl sm:p-5">
            <label>
              <span className="text-sm font-black text-slate-700">Your writing</span>
              <textarea
                value={draft}
                onChange={(event) => onDraftChange(event.target.value)}
                rows={9}
                className="mt-2 w-full resize-y rounded-2xl border-4 border-slate-200 bg-slate-50 p-4 text-lg font-semibold leading-7 text-slate-950 outline-none focus:border-emerald-400"
                placeholder="I’d like to visit…"
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              {SESSION_1_WRITING_PROMPT.wordBank.map((word) => (
                <button key={word} type="button" onClick={() => addWord(word)} className="rounded-full border-2 border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-900">
                  + {word}
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className={`text-sm font-black ${ready ? "text-emerald-700" : "text-slate-500"}`}>
                {words}/{SESSION_1_WRITING_PROMPT.minimumWords} words
              </p>
              <button
                type="button"
                disabled={!ready}
                onClick={onComplete}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-black text-white shadow-lg disabled:opacity-40"
              >
                <CheckCircle2 className="h-5 w-5" /> Finish writing
              </button>
            </div>
            <p className="mt-3 text-xs font-bold text-slate-500">Your draft is saved on this device while you work.</p>
          </div>
        </div>
      </div>
    </ActivityFrame>
  );
}

export function Grade4Session1PracticePack({
  pilotMode = false,
  initialRun = null,
}: {
  pilotMode?: boolean;
  initialRun?: CourseSessionRunRecord | null;
}) {
  const completionStorageKey = "wke-grade4-unit1-session1-practice-completed";
  const writingStorageKey = "wke-grade4-unit1-session1-writing";
  const restoredPractice = initialRun?.state.practice;
  const [active, setActive] = useState<Session1PracticeActivityId | null>(
    restoredPractice?.activeActivityId ?? null,
  );
  const [completed, setCompleted] = useState<Session1PracticeActivityId[]>(
    restoredPractice?.completedActivityIds ?? [],
  );
  const [writingDraft, setWritingDraft] = useState(restoredPractice?.writingDraft ?? "");
  const [progressLoaded, setProgressLoaded] = useState(!pilotMode);
  const backHref = pilotMode
    ? "/pilots/grade-4-learning-paths/unit-1/session-1"
    : "/primary/learn/grade-4/unit-1/session-1";

  useEffect(() => {
    if (!pilotMode) return;
    try {
      const saved = JSON.parse(window.localStorage.getItem(completionStorageKey) ?? "[]");
      const validIds = new Set(ACTIVITIES.map((activity) => activity.id));
      if (Array.isArray(saved)) {
        setCompleted(saved.filter((id): id is Session1PracticeActivityId => typeof id === "string" && validIds.has(id as Session1PracticeActivityId)));
      }
    } catch {
      setCompleted([]);
    } finally {
      setWritingDraft(window.localStorage.getItem(writingStorageKey) ?? "");
      setProgressLoaded(true);
    }
  }, [pilotMode]);

  useEffect(() => {
    if (!pilotMode || !progressLoaded) return;
    window.localStorage.setItem(completionStorageKey, JSON.stringify(completed));
    window.localStorage.setItem(writingStorageKey, writingDraft);
  }, [completed, pilotMode, progressLoaded, writingDraft]);

  function complete(id: Session1PracticeActivityId) {
    setCompleted((current) => current.includes(id) ? current : [...current, id]);
    setActive(null);
  }

  const percentage = Math.round((completed.length / ACTIVITIES.length) * 100);
  const allComplete = completed.length === ACTIVITIES.length;
  const practiceProgress = useMemo<Session1PracticeProgress>(
    () => ({
      activeActivityId: active,
      completedActivityIds: completed,
      writingDraft,
    }),
    [active, completed, writingDraft],
  );
  const saveState = useGrade4Session1Autosave({
    enabled: !pilotMode,
    phase: "practice",
    status: allComplete ? "completed" : "in_progress",
    activeStepId: active ?? "practice-menu",
    progress: practiceProgress,
  });

  if (active === "vocabulary") return <PracticeStageShell active={active} completed={completed} onNavigate={setActive}><VocabularyCards onComplete={() => complete(active)} onBack={() => setActive(null)} /></PracticeStageShell>;
  if (active === "letter-scramble") return <PracticeStageShell active={active} completed={completed} onNavigate={setActive}><LetterScramble onComplete={() => complete(active)} onBack={() => setActive(null)} /></PracticeStageShell>;
  if (active === "grammar-focus") return <PracticeStageShell active={active} completed={completed} onNavigate={setActive}><GrammarFocus onComplete={() => complete(active)} onBack={() => setActive(null)} /></PracticeStageShell>;
  if (active === "fix-sentence") return <PracticeStageShell active={active} completed={completed} onNavigate={setActive}><FixSentence onComplete={() => complete(active)} onBack={() => setActive(null)} /></PracticeStageShell>;
  if (active === "free-writing") return <PracticeStageShell active={active} completed={completed} onNavigate={setActive}><FreeWriting draft={writingDraft} onDraftChange={setWritingDraft} onComplete={() => complete(active)} onBack={() => setActive(null)} /></PracticeStageShell>;

  return (
    <main className="min-h-dvh bg-[linear-gradient(155deg,#171229_0%,#2d1b69_55%,#164e63_100%)] px-3 py-5 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-[1.75rem] border border-white/20 bg-white/95 p-4 shadow-2xl sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <Link href={backHref} className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-800" aria-label="Back to the Welcome Fair">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">Unit 1 · Session 1</p>
              <h1 className="text-2xl font-black text-slate-950 sm:text-4xl">Welcome Fair practice pack</h1>
              <p className="mt-1 text-sm font-bold text-slate-600 sm:text-base">Five short activities that turn your hotspot speaking into strong homework practice.</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="rounded-full bg-violet-700 px-4 py-2 text-sm font-black text-white">{completed.length}/5 done</span>
              {!pilotMode ? (
                <span
                  className={`text-xs font-black ${saveState.status === "error" ? "text-amber-700" : "text-emerald-700"}`}
                  title={saveState.status === "error" ? saveState.error : undefined}
                >
                  {saveState.status === "saving" ? "Saving…" : saveState.status === "error" ? "Save paused" : "Progress saved"}
                </span>
              ) : null}
            </div>
            <div className="basis-full">
              <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 transition-all duration-500" style={{ width: `${percentage}%` }} />
              </div>
            </div>
          </div>
        </header>

        {allComplete ? (
          <section className="mt-5 rounded-[1.75rem] border-4 border-emerald-300 bg-emerald-50 p-6 text-center shadow-xl">
            <Sparkles className="mx-auto h-12 w-12 text-emerald-600" />
            <h2 className="mt-2 text-3xl font-black text-emerald-950">Practice pack complete!</h2>
            <p className="mt-2 font-bold text-emerald-800">You explored, spoke, spelled, checked grammar, fixed sentences, and wrote your own answer.</p>
          </section>
        ) : null}

        <section className="mt-5 grid gap-4 md:grid-cols-2">
          {ACTIVITIES.map((activity, index) => {
            const done = completed.includes(activity.id);
            const nextRecommended = !done && ACTIVITIES.slice(0, index).every((item) => completed.includes(item.id));
            return (
              <button
                key={activity.id}
                type="button"
                onClick={() => setActive(activity.id)}
                className={`group relative overflow-hidden rounded-[1.6rem] border-4 bg-white p-5 text-left shadow-xl transition hover:-translate-y-1 hover:shadow-2xl ${done ? "border-emerald-300" : nextRecommended ? "border-amber-300 ring-4 ring-amber-300/30" : "border-white/70"}`}
              >
                <span className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${activity.color}`}>
                  <ActivityIcon id={activity.id} />
                </span>
                <span className="mt-4 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">Activity {index + 1} · {activity.minutes} min</span>
                <span className="mt-1 block text-2xl font-black text-slate-950">{activity.title}</span>
                <span className="mt-1 block text-sm font-bold text-slate-600">{activity.subtitle}</span>
                <span className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white">
                  {done ? "Practise again" : nextRecommended ? "Start next" : "Open activity"} <ChevronRight className="h-5 w-5 transition group-hover:translate-x-1" />
                </span>
                {done ? (
                  <span className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <Check className="h-6 w-6" />
                  </span>
                ) : null}
              </button>
            );
          })}
        </section>
      </div>
    </main>
  );
}
