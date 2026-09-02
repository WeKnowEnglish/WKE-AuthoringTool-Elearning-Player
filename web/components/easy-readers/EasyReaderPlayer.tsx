"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Headphones,
  List,
  MessageCircle,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  Square,
  Volume2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { EasyReaderBook } from "@/content/easy-readers/book-1";
import { speakText, speakTextAndWait, stopSpeaking } from "@/lib/audio/tts";

type Props = {
  book: EasyReaderBook;
  backHref?: string;
  backLabel?: string;
};
type AnswerState = Record<string, "correct" | "wrong">;

const progressStorageKey = (bookId: string) => `wke-easy-reader:${bookId}:progress-v1`;

export function EasyReaderPlayer({
  book,
  backHref,
  backLabel = "Back",
}: Props) {
  const [started, setStarted] = useState(false);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [openWord, setOpenWord] = useState<string | null>(null);
  const [answerStates, setAnswerStates] = useState<AnswerState>({});
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [contentsOpen, setContentsOpen] = useState(false);
  const [textScale, setTextScale] = useState<"normal" | "large">("normal");
  const [listening, setListening] = useState(false);
  const [completed, setCompleted] = useState(false);

  const chapter = book.chapters[chapterIndex]!;
  const chapterState = answerStates[chapter.id];
  const readText = useMemo(
    () => `${chapter.title}. ${chapter.paragraphs.join(" ")}`,
    [chapter],
  );
  const completedCount = Object.values(answerStates).filter(
    (value) => value === "correct",
  ).length;
  const progress = completed
    ? 100
    : Math.round((completedCount / book.chapters.length) * 100);
  const canContinue = chapterState === "correct";
  const isLastChapter = chapterIndex === book.chapters.length - 1;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(progressStorageKey(book.id));
      if (!saved) return;
      const parsed = JSON.parse(saved) as {
        started?: boolean;
        chapterIndex?: number;
        answers?: AnswerState;
        completed?: boolean;
      };
      setStarted(Boolean(parsed.started));
      setChapterIndex(
        Math.min(book.chapters.length - 1, Math.max(0, parsed.chapterIndex ?? 0)),
      );
      setAnswerStates(parsed.answers ?? {});
      setCompleted(Boolean(parsed.completed));
    } catch {
      // Progress is optional. A malformed browser value should never block reading.
    }
  }, [book.chapters.length, book.id]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        progressStorageKey(book.id),
        JSON.stringify({ started, chapterIndex, answers: answerStates, completed }),
      );
    } catch {
      // Private browsing or full storage can disable persistence without affecting play.
    }
  }, [answerStates, book.id, chapterIndex, completed, started]);

  useEffect(() => {
    setOpenWord(null);
    setSelectedChoice(null);
    setListening(false);
    stopSpeaking();
  }, [chapter.id]);

  const goToChapter = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= book.chapters.length) return;
      setChapterIndex(nextIndex);
      setContentsOpen(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [book.chapters.length],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!started || completed || contentsOpen) return;
      if (event.key === "ArrowLeft" && chapterIndex > 0) {
        event.preventDefault();
        goToChapter(chapterIndex - 1);
      }
      if (
        event.key === "ArrowRight" &&
        canContinue &&
        chapterIndex < book.chapters.length - 1
      ) {
        event.preventDefault();
        goToChapter(chapterIndex + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    book.chapters.length,
    canContinue,
    chapterIndex,
    completed,
    contentsOpen,
    goToChapter,
    started,
  ]);

  const startListening = () => {
    setListening(true);
    void speakTextAndWait(readText, { rate: 0.84 }).finally(() => {
      setListening(false);
    });
  };

  const stopListening = () => {
    stopSpeaking();
    setListening(false);
  };

  const resetBook = () => {
    stopSpeaking();
    setStarted(false);
    setChapterIndex(0);
    setAnswerStates({});
    setSelectedChoice(null);
    setCompleted(false);
    try {
      window.localStorage.removeItem(progressStorageKey(book.id));
    } catch {
      // Optional local progress only.
    }
  };

  if (!started) {
    return (
      <main className="min-h-dvh bg-[radial-gradient(circle_at_15%_20%,#ffffff_0_10%,transparent_32%),linear-gradient(145deg,#dff4ff_0%,#ffffff_52%,#efe8ff_100%)] p-3 sm:p-8">
        {backHref ? (
          <div className="mx-auto mb-4 max-w-6xl">
            <ReaderBackLink href={backHref} label={backLabel} />
          </div>
        ) : null}
        <section className="mx-auto grid min-h-[calc(100dvh-1.5rem)] max-w-6xl items-center gap-7 overflow-hidden rounded-[2rem] border-4 border-[#173b8f] bg-white/95 p-4 shadow-[9px_9px_0_#173b8f] md:grid-cols-[minmax(260px,0.76fr)_1.24fr] md:p-9">
          <div className="mx-auto w-full max-w-[350px] overflow-hidden rounded-[1.6rem] border-4 border-[#173b8f] shadow-[0_20px_50px_rgba(23,59,143,0.24)]">
            <Image
              src={book.cover}
              alt={`Cover of ${book.title}`}
              width={1086}
              height={1448}
              priority
              className="h-auto w-full"
            />
          </div>

          <div className="text-center md:text-left">
            <div className="flex flex-wrap justify-center gap-2 md:justify-start">
              <span className="rounded-full bg-[#173b8f] px-4 py-2 text-sm font-black text-white">
                {book.level}
              </span>
              <span className="rounded-full bg-[#6f3cc3] px-4 py-2 text-sm font-black text-white">
                Book {book.bookNumber}
              </span>
              <span className="rounded-full bg-[#279b2e] px-4 py-2 text-sm font-black text-white">
                6 chapters
              </span>
            </div>
            <p className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-[#279b2e]">
              {book.series}
            </p>
            <h1 className="mt-2 text-5xl font-black tracking-tight text-[#173b8f] sm:text-6xl">
              {book.title}
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg font-bold leading-relaxed text-[#32456f] md:mx-0">
              {book.description}
            </p>

            <div className="mx-auto mt-6 max-w-xl rounded-2xl border-2 border-[#c4d5f4] bg-[#f3f7ff] p-4 text-left md:mx-0">
              <p className="flex items-center gap-2 font-black text-[#173b8f]">
                <Sparkles className="h-5 w-5 text-[#f0a400]" aria-hidden /> In this story, you can…
              </p>
              <ul className="mt-3 space-y-2">
                {book.learningGoals.map((goal) => (
                  <li key={goal} className="flex gap-2 text-sm font-bold text-[#42567f]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#279b2e]" aria-hidden />
                    {goal}
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => setStarted(true)}
              className="mt-7 inline-flex min-h-16 items-center gap-3 rounded-2xl border-4 border-[#173b8f] bg-[#ffe135] px-8 text-xl font-black text-[#173b8f] shadow-[5px_5px_0_#173b8f] hover:-translate-y-1 hover:bg-[#fff176] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#6f3cc3] motion-reduce:hover:translate-y-0"
            >
              <BookOpen className="h-6 w-6" aria-hidden />
              {completedCount > 0 ? "Continue reading" : "Start reading"}
            </button>
            <p className="mt-4 text-sm font-bold text-[#60729b]">
              Read • Listen • Tap words • Check understanding
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (completed) {
    return (
      <main className="relative flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_top,#fff8bf,#dff4ff_55%,#e9ddff)] p-5 pt-24">
        {backHref ? (
          <div className="absolute left-5 top-5 sm:left-8 sm:top-8">
            <ReaderBackLink href={backHref} label={backLabel} />
          </div>
        ) : null}
        <section className="w-full max-w-2xl rounded-[2rem] border-4 border-[#173b8f] bg-white p-7 text-center shadow-[9px_9px_0_#173b8f] sm:p-10">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#173b8f] bg-[#ffe135]">
            <Award className="h-14 w-14 text-[#173b8f]" aria-hidden />
          </div>
          <p className="mt-6 text-sm font-black uppercase tracking-[0.18em] text-[#279b2e]">
            Reader complete
          </p>
          <h1 className="mt-2 text-4xl font-black text-[#173b8f] sm:text-5xl">
            Wonderful reading!
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-lg font-bold leading-relaxed text-[#42567f]">
            You finished <em>{book.title}</em> and answered all six checks. Sam has a
            new school—and new friends.
          </p>
          <div className="mt-7 rounded-2xl bg-[#eef9ee] p-5 text-left">
            <p className="font-black text-[#1d7423]">Now tell someone:</p>
            <p className="mt-2 text-lg font-bold text-[#284d2b]">
              How can you help a new student feel welcome?
            </p>
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setCompleted(false);
                goToChapter(0);
              }}
              className="inline-flex min-h-14 items-center gap-2 rounded-xl border-4 border-[#173b8f] bg-white px-5 font-black text-[#173b8f]"
            >
              <BookOpen className="h-5 w-5" aria-hidden /> Read again
            </button>
            <button
              type="button"
              onClick={resetBook}
              className="inline-flex min-h-14 items-center gap-2 rounded-xl border-4 border-[#173b8f] bg-[#ffe135] px-5 font-black text-[#173b8f] shadow-[4px_4px_0_#173b8f]"
            >
              <RotateCcw className="h-5 w-5" aria-hidden /> Reset book
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,#dff4ff_0%,#f8fbff_45%,#eef8e9_100%)] p-2 sm:p-5">
      <div className="mx-auto max-w-7xl">
        <header className="sticky top-2 z-30 rounded-2xl border-4 border-[#173b8f] bg-white/95 px-3 py-3 shadow-[5px_5px_0_#173b8f] backdrop-blur-md sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {backHref ? (
                <Link
                  href={backHref}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-[#b8c9ee] bg-[#eef4ff] text-[#173b8f] hover:border-[#173b8f] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#6f3cc3]"
                  aria-label={backLabel}
                  title={backLabel}
                >
                  <ArrowLeft className="h-5 w-5" aria-hidden />
                </Link>
              ) : null}
              <div className="min-w-0">
                <p className="truncate text-[11px] font-black uppercase tracking-[0.16em] text-[#279b2e]">
                  {book.level} · {book.title}
                </p>
                <h1 className="truncate text-lg font-black text-[#173b8f] sm:text-2xl">
                  Chapter {chapter.number}: {chapter.title}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setContentsOpen(true)}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-[#b8c9ee] bg-[#eef4ff] px-3 text-sm font-black text-[#173b8f] hover:border-[#173b8f]"
              >
                <List className="h-5 w-5" aria-hidden />
                <span className="hidden sm:inline">Contents</span>
              </button>
              {listening ? (
                <button
                  type="button"
                  onClick={stopListening}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#d83d56] px-3 text-sm font-black text-white"
                >
                  <Square className="h-4 w-4 fill-current" aria-hidden /> Stop
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startListening}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#6f3cc3] px-3 text-sm font-black text-white hover:bg-[#5730a0]"
                >
                  <Headphones className="h-5 w-5" aria-hidden /> Listen
                </button>
              )}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div
              className="h-3 flex-1 overflow-hidden rounded-full bg-[#d8e2f5]"
              aria-label={`${progress}% complete`}
            >
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#279b2e,#7acb41)] transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs font-black tabular-nums text-[#173b8f]">
              {completedCount}/6 checks
            </span>
          </div>
        </header>

        <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_350px]">
          <div className="space-y-5">
            <figure className="relative aspect-[16/9] overflow-hidden rounded-[2rem] border-4 border-[#173b8f] bg-[#bfdff7] shadow-[7px_7px_0_#173b8f]">
              <Image
                key={chapter.illustration}
                src={chapter.illustration}
                alt={chapter.illustrationAlt}
                fill
                priority={chapterIndex === 0}
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 70vw"
              />
              <figcaption className="absolute inset-x-3 bottom-3 rounded-xl bg-[#102a6a]/88 px-4 py-2 text-sm font-black text-white backdrop-blur-sm sm:inset-x-auto sm:left-4">
                Chapter {chapter.number} · {chapter.title}
              </figcaption>
            </figure>

            <article className="rounded-[2rem] border-4 border-[#173b8f] bg-[#fffdf4] p-5 shadow-[7px_7px_0_#173b8f] sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6f3cc3]">
                    Story focus
                  </p>
                  <p className="mt-1 font-bold text-[#52658d]">{chapter.focus}</p>
                </div>
                <div
                  className="flex items-center gap-1 rounded-xl border-2 border-[#d3ddef] bg-white p-1"
                  aria-label="Text size"
                >
                  <button
                    type="button"
                    onClick={() => setTextScale("normal")}
                    aria-pressed={textScale === "normal"}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${textScale === "normal" ? "bg-[#173b8f] text-white" : "text-[#173b8f]"}`}
                    aria-label="Normal text size"
                  >
                    <Minus className="h-4 w-4" aria-hidden />
                  </button>
                  <span className="px-1 text-sm font-black text-[#173b8f]">Aa</span>
                  <button
                    type="button"
                    onClick={() => setTextScale("large")}
                    aria-pressed={textScale === "large"}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${textScale === "large" ? "bg-[#173b8f] text-white" : "text-[#173b8f]"}`}
                    aria-label="Large text size"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
              <div
                className={`mt-6 space-y-5 font-bold text-[#1c2c5b] ${textScale === "large" ? "text-[1.55rem] leading-[1.9] sm:text-[1.75rem]" : "text-[1.2rem] leading-[1.8] sm:text-[1.38rem]"}`}
              >
                {chapter.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>

            <section
              className="rounded-[2rem] border-4 border-[#173b8f] bg-white p-5 shadow-[7px_7px_0_#173b8f] sm:p-7"
              aria-labelledby="quick-check-title"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#ffe135] text-[#173b8f]">
                  <CheckCircle2 className="h-6 w-6" aria-hidden />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#279b2e]">
                    Quick check
                  </p>
                  <h2 id="quick-check-title" className="text-xl font-black text-[#173b8f]">
                    {chapter.check.question}
                  </h2>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {chapter.check.choices.map((choice, index) => {
                  const isChosen = selectedChoice === index;
                  const isCorrect = index === chapter.check.answerIndex;
                  const showCorrect = chapterState === "correct" && isCorrect;
                  const showWrong = chapterState === "wrong" && isChosen;
                  return (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => {
                        setSelectedChoice(index);
                        setAnswerStates((states) => ({
                          ...states,
                          [chapter.id]: isCorrect ? "correct" : "wrong",
                        }));
                      }}
                      className={`min-h-16 rounded-2xl border-3 px-4 py-3 text-left font-black transition ${showCorrect ? "border-[#279b2e] bg-[#e8f8e7] text-[#195e1e]" : showWrong ? "border-[#d83d56] bg-[#fff0f2] text-[#9b2639]" : isChosen ? "border-[#6f3cc3] bg-[#f3edff] text-[#4f278f]" : "border-[#c2d1ed] bg-[#f7f9ff] text-[#173b8f] hover:border-[#6f3cc3]"}`}
                    >
                      <span className="flex items-center gap-2">
                        {showCorrect ? (
                          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
                        ) : (
                          <Circle className="h-5 w-5 shrink-0" aria-hidden />
                        )}
                        {choice}
                      </span>
                    </button>
                  );
                })}
              </div>
              {chapterState ? (
                <p
                  className={`mt-4 rounded-xl p-3 text-sm font-black ${chapterState === "correct" ? "bg-[#e8f8e7] text-[#195e1e]" : "bg-[#fff0f2] text-[#9b2639]"}`}
                  role="status"
                >
                  {chapterState === "correct"
                    ? chapter.check.success
                    : chapter.check.retry}
                </p>
              ) : null}
            </section>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-36 lg:self-start">
            <section
              className="rounded-[2rem] border-4 border-[#173b8f] bg-white p-5 shadow-[7px_7px_0_#173b8f]"
              aria-labelledby="vocabulary-title"
            >
              <div className="flex items-center gap-2 text-[#173b8f]">
                <Volume2 className="h-5 w-5" aria-hidden />
                <h2 id="vocabulary-title" className="text-xl font-black">
                  Tap a new word
                </h2>
              </div>
              <p className="mt-1 text-sm font-bold text-[#60729b]">
                Hear it, then open its meaning.
              </p>
              <div className="mt-4 space-y-3">
                {chapter.vocabulary.map((entry) => (
                  <button
                    key={entry.word}
                    type="button"
                    onClick={() => {
                      setOpenWord(openWord === entry.word ? null : entry.word);
                      speakText(entry.word, { rate: 0.76 });
                    }}
                    className="w-full rounded-2xl border-2 border-[#b8c9ee] bg-[#eef4ff] p-4 text-left text-[#173b8f] hover:border-[#6f3cc3] hover:bg-[#f3edff]"
                    aria-expanded={openWord === entry.word}
                  >
                    <span className="flex items-center justify-between gap-3 text-lg font-black">
                      {entry.word}
                      <Volume2 className="h-4 w-4 shrink-0" aria-hidden />
                    </span>
                    {openWord === entry.word ? (
                      <span className="mt-2 block text-sm font-bold leading-relaxed text-[#42567f]">
                        {entry.meaning}
                        <span className="mt-2 block italic">“{entry.example}”</span>
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border-4 border-[#6f3cc3] bg-[#f4eeff] p-5 shadow-[6px_6px_0_#6f3cc3]">
              <h2 className="flex items-center gap-2 text-lg font-black text-[#4f278f]">
                <MessageCircle className="h-5 w-5" aria-hidden /> Think and talk
              </h2>
              <p className="mt-3 text-base font-bold leading-relaxed text-[#533879]">
                {chapter.talkPrompt}
              </p>
            </section>
          </aside>
        </section>

        <nav
          className="mt-6 flex items-center justify-between gap-3 pb-7"
          aria-label="Reader navigation"
        >
          <button
            type="button"
            disabled={chapterIndex === 0}
            onClick={() => goToChapter(chapterIndex - 1)}
            className="inline-flex min-h-14 items-center gap-2 rounded-xl border-4 border-[#173b8f] bg-white px-4 font-black text-[#173b8f] disabled:opacity-35"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden /> Back
          </button>
          <p className="hidden text-sm font-black text-[#173b8f] sm:block">
            Chapter {chapterIndex + 1} of {book.chapters.length}
          </p>
          <button
            type="button"
            disabled={!canContinue}
            onClick={() => {
              if (isLastChapter) setCompleted(true);
              else goToChapter(chapterIndex + 1);
            }}
            className="inline-flex min-h-14 items-center gap-2 rounded-xl border-4 border-[#173b8f] bg-[#ffe135] px-5 font-black text-[#173b8f] shadow-[4px_4px_0_#173b8f] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            title={!canContinue ? "Answer the quick check to continue" : undefined}
          >
            {isLastChapter ? "Finish book" : "Next chapter"}
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </nav>
      </div>

      {contentsOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-stretch justify-end bg-[#0c1f52]/55 p-2 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contents-title"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setContentsOpen(false);
          }}
        >
          <section className="h-full w-full max-w-md overflow-y-auto rounded-[1.5rem] border-4 border-[#173b8f] bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.15em] text-[#279b2e]">
                  {book.title}
                </p>
                <h2 id="contents-title" className="text-2xl font-black text-[#173b8f]">
                  Table of contents
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setContentsOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef4ff] text-[#173b8f]"
                aria-label="Close contents"
              >
                <X className="h-6 w-6" aria-hidden />
              </button>
            </div>
            <ol className="mt-6 space-y-3">
              {book.chapters.map((item, index) => {
                const isCurrent = index === chapterIndex;
                const isDone = answerStates[item.id] === "correct";
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => goToChapter(index)}
                      className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left ${isCurrent ? "border-[#6f3cc3] bg-[#f3edff]" : "border-[#c8d6ef] bg-[#f8faff] hover:border-[#173b8f]"}`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-black ${isDone ? "bg-[#279b2e] text-white" : "bg-[#173b8f] text-white"}`}
                      >
                        {isDone ? <Check className="h-5 w-5" aria-hidden /> : item.number}
                      </span>
                      <span>
                        <span className="block font-black text-[#173b8f]">
                          {item.title}
                        </span>
                        <span className="block text-xs font-bold text-[#60729b]">
                          {item.focus}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function ReaderBackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-12 items-center gap-2 rounded-xl border-3 border-[#173b8f] bg-white px-4 font-black text-[#173b8f] shadow-[3px_3px_0_#173b8f] transition hover:-translate-y-0.5 hover:bg-[#eef4ff] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#6f3cc3] motion-reduce:hover:translate-y-0"
    >
      <ArrowLeft className="h-5 w-5" aria-hidden />
      {label}
    </Link>
  );
}
