"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { BookOpenCheck, Check, ChevronLeft, ChevronRight, ClipboardCheck, Clock3, RotateCcw, Save, Send, Volume2 } from "lucide-react";
import { assessmentAttemptStorageKey, assessmentProgress, listAssessmentParts, normalizeAssessmentDefinition, PRIMARY_A2_ASSESSMENT_PILOT, shuffleAssessmentDisplay, type AssessmentAttempt, type AssessmentDefinition, type AssessmentPart } from "@/lib/assessment";
import { listClozeChoiceGaps } from "@/lib/cloze-choice";
import { listClozeOpenGaps } from "@/lib/cloze-open";
import { savePrimaryA2AssessmentAttempt } from "@/lib/actions/assessment-attempt";
import { AssessmentSpeakingRecorder } from "@/components/assessment/AssessmentSpeakingRecorder";
import type { AssessmentSpeakingRecording, AssessmentSpeakingReview } from "@/lib/assessment";

function newAttempt(definition: AssessmentDefinition): AssessmentAttempt {
  return {
    schemaVersion: 1,
    attemptId: `pilot-${Date.now()}`,
    definitionId: definition.id,
    contentVersion: definition.contentVersion,
    status: "not_started",
    activePartId: listAssessmentParts(definition)[0]?.id ?? "",
    responses: {},
    startedAt: null,
    updatedAt: new Date().toISOString(),
    submittedAt: null,
  };
}

type PartProps<T extends AssessmentPart> = {
  part: T;
  answers: Record<string, string>;
  onAnswer: (itemId: string, answer: string) => void;
  /** Stable per attempt so bank letters stay consistent after remount. */
  shuffleSeed: string;
};

function DefinitionMatchPart({
  part,
  answers,
  onAnswer,
  shuffleSeed,
}: PartProps<Extract<AssessmentPart, { kind: "definition_match" }>>) {
  const choices = useMemo(() => {
    const bank = [
      ...part.activity.pairs.map(({ id, word }) => ({ id, word })),
      ...(part.extraWords ?? []),
    ];
    return shuffleAssessmentDisplay(bank, `${shuffleSeed}:${part.id}:words`);
  }, [part.activity.pairs, part.extraWords, part.id, shuffleSeed]);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border-2 border-sky-200 bg-sky-50 p-4">
        <p className="text-xs font-black uppercase tracking-[0.15em] text-sky-800">
          Word bank
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {choices.map((choice) => (
            <span
              key={choice.id}
              className="rounded-full border-2 border-sky-200 bg-white px-3 py-1 text-sm font-extrabold text-slate-800"
            >
              {choice.word}
            </span>
          ))}
        </div>
      </div>
      {part.activity.pairs.map((pair, index) => (
        <label
          key={pair.id}
          className="grid gap-3 rounded-2xl border-2 border-slate-200 bg-white p-4 sm:grid-cols-[2.2rem_minmax(0,1fr)_12rem] sm:items-center"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 font-black text-amber-900">
            {index + 1}
          </span>
          <span className="font-bold leading-6 text-slate-800">
            {pair.definition}
          </span>
          <select
            aria-label={`Answer for definition ${index + 1}`}
            value={answers[pair.id] ?? ""}
            onChange={(event) => onAnswer(pair.id, event.target.value)}
            className="min-h-12 w-full rounded-xl border-2 border-slate-300 bg-white px-3 font-bold text-slate-900 focus:border-teal-600 focus:outline-none"
          >
            <option value="">Choose a word</option>
            {choices.map((choice) => (
              <option key={choice.id} value={choice.id}>
                {choice.word}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}

function ReadAndAnswerPart({
  part,
  answers,
  onAnswer,
  shuffleSeed,
}: PartProps<Extract<AssessmentPart, { kind: "read_and_answer" }>>) {
  const optionsByQuestion = useMemo(() => {
    const map: Record<string, (typeof part.activity.questions)[number]["options"]> =
      {};
    for (const question of part.activity.questions) {
      map[question.id] = shuffleAssessmentDisplay(
        question.options,
        `${shuffleSeed}:${part.id}:${question.id}:opts`,
      );
    }
    return map;
  }, [part.activity.questions, part.id, shuffleSeed]);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.8fr)] lg:items-start">
      <article className="rounded-2xl border-2 border-amber-200 bg-amber-50/70 p-5 lg:sticky lg:top-28">
        <p className="text-xs font-black uppercase tracking-[0.15em] text-amber-800">
          Read the story
        </p>
        <h3 className="mt-2 text-xl font-black text-slate-900">
          {part.activity.passage.title}
        </h3>
        <p className="mt-4 whitespace-pre-wrap text-base font-semibold leading-8 text-slate-800">
          {part.activity.passage.text}
        </p>
      </article>
      <div className="space-y-4">
        {part.activity.questions.map((question, index) => (
          <fieldset
            key={question.id}
            className="rounded-2xl border-2 border-slate-200 bg-white p-4"
          >
            <legend className="px-1 text-sm font-black text-slate-900">
              {index + 1}. {question.prompt}
            </legend>
            <div className="mt-3 space-y-2">
              {(optionsByQuestion[question.id] ?? question.options).map(
                (option) => {
                  const checked = answers[question.id] === option.id;
                  return (
                    <label
                      key={option.id}
                      className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-2 font-bold transition ${
                        checked
                          ? "border-teal-600 bg-teal-50 text-teal-950"
                          : "border-slate-200 bg-white text-slate-700 hover:border-teal-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        value={option.id}
                        checked={checked}
                        onChange={() => onAnswer(question.id, option.id)}
                        className="h-5 w-5 accent-teal-700"
                      />
                      {option.text}
                    </label>
                  );
                },
              )}
            </div>
          </fieldset>
        ))}
      </div>
    </div>
  );
}

function ShortAnswerReadingPart({ part, answers, onAnswer }: PartProps<Extract<AssessmentPart, { kind: "short_answer_reading" }>>) {
  return <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.8fr)] lg:items-start">
    <article className="rounded-2xl border-2 border-amber-200 bg-amber-50/70 p-5 lg:sticky lg:top-28">
      <p className="text-xs font-black uppercase tracking-[0.15em] text-amber-800">Read the story</p>
      <h3 className="mt-2 text-xl font-black text-slate-900">{part.activity.passage.title}</h3>
      <p className="mt-4 whitespace-pre-wrap text-base font-semibold leading-8 text-slate-800">{part.activity.passage.text}</p>
    </article>
    <div className="space-y-4">{part.activity.questions.map((question, index) => <label key={question.id} className="block rounded-2xl border-2 border-slate-200 bg-white p-4">
      <span className="text-sm font-black text-slate-900">{index + 1}. {question.prompt}</span>
      <span className="mt-2 block text-xs font-semibold text-slate-500">Write a short answer.</span>
      <input type="text" autoComplete="off" spellCheck={false} value={answers[question.id] ?? ""} onChange={(event) => onAnswer(question.id, event.target.value)} className="mt-3 min-h-12 w-full rounded-xl border-2 border-slate-300 px-3 font-bold text-slate-900 focus:border-teal-600 focus:outline-none" />
    </label>)}</div>
  </div>;
}

function PictureYesNoPart({ part, answers, onAnswer }: PartProps<Extract<AssessmentPart, { kind: "picture_yes_no" }>>) {
  return <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:items-start">
    <figure className="overflow-hidden rounded-2xl border-2 border-sky-200 bg-white p-3 lg:sticky lg:top-28">
      <Image src={part.activity.image.src} alt={part.activity.image.alt} width={1600} height={900} className="h-auto w-full rounded-xl" priority />
      <figcaption className="px-2 pb-1 pt-3 text-center text-xs font-bold text-slate-500">Look at every part of the picture before answering.</figcaption>
    </figure>
    <div className="space-y-3">{part.activity.statements.map((statement, index) => <fieldset key={statement.id} className="rounded-2xl border-2 border-slate-200 bg-white p-4">
      <legend className="px-1 text-sm font-black leading-6 text-slate-900">{index + 1}. {statement.text}</legend>
      <div className="mt-3 grid grid-cols-2 gap-3">{(["yes", "no"] as const).map((choice) => { const checked = answers[statement.id] === choice; return <label key={choice} className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 font-black capitalize ${checked ? "border-teal-600 bg-teal-50 text-teal-950" : "border-slate-200 text-slate-700 hover:border-teal-300"}`}><input type="radio" name={statement.id} checked={checked} onChange={() => onAnswer(statement.id, choice)} className="h-5 w-5 accent-teal-700" />{choice}</label>; })}</div>
    </fieldset>)}</div>
  </div>;
}

function DialogueBankPart({
  part,
  answers,
  onAnswer,
  shuffleSeed,
}: PartProps<Extract<AssessmentPart, { kind: "dialogue_bank" }>>) {
  const responses = useMemo(
    () =>
      shuffleAssessmentDisplay(
        part.activity.responses,
        `${shuffleSeed}:${part.id}:responses`,
      ),
    [part.activity.responses, part.id, shuffleSeed],
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(18rem,0.75fr)_minmax(0,1.25fr)] lg:items-start">
      <aside className="rounded-2xl border-2 border-sky-200 bg-sky-50 p-5 lg:sticky lg:top-28">
        <p className="text-xs font-black uppercase tracking-[0.15em] text-sky-800">
          Response bank
        </p>
        <p className="mt-2 text-sm font-bold text-slate-600">
          Each response can be used once. Two responses are extra.
        </p>
        <ol className="mt-4 space-y-2">
          {responses.map((response, index) => (
            <li
              key={response.id}
              className="rounded-xl border-2 border-sky-100 bg-white p-3 text-sm font-bold leading-6 text-slate-800"
            >
              <span className="mr-2 font-black text-sky-700">
                {String.fromCharCode(65 + index)}.
              </span>
              {response.text}
            </li>
          ))}
        </ol>
      </aside>
      <section className="space-y-4">
        <p className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 font-bold text-slate-800">
          {part.activity.opening}
        </p>
        {part.activity.exchanges.map((exchange, index) => (
          <div
            key={exchange.id}
            className="rounded-2xl border-2 border-slate-200 bg-white p-4"
          >
            <p className="font-black leading-6 text-slate-900">
              <span className="text-teal-700">{exchange.speaker}:</span>{" "}
              {exchange.prompt}
            </p>
            <label className="mt-3 block">
              <span className="sr-only">Response {index + 1}</span>
              <select
                value={answers[exchange.id] ?? ""}
                onChange={(event) => onAnswer(exchange.id, event.target.value)}
                className="min-h-12 w-full rounded-xl border-2 border-slate-300 bg-white px-3 font-bold text-slate-900 focus:border-teal-600 focus:outline-none"
              >
                <option value="">Choose Jack&apos;s response</option>
                {responses.map((response, responseIndex) => (
                  <option key={response.id} value={response.id}>
                    {String.fromCharCode(65 + responseIndex)}. {response.text}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ))}
      </section>
    </div>
  );
}

function StoryBankTitlePart({
  part,
  answers,
  onAnswer,
  shuffleSeed,
}: PartProps<Extract<AssessmentPart, { kind: "story_bank_title" }>>) {
  const gaps = part.activity.segments.filter((segment) => segment.type === "gap");
  const gapNumber = new Map(gaps.map((gap, index) => [gap.id, index + 1]));
  const words = useMemo(
    () =>
      shuffleAssessmentDisplay(
        part.activity.words,
        `${shuffleSeed}:${part.id}:words`,
      ),
    [part.activity.words, part.id, shuffleSeed],
  );
  const titleOptions = useMemo(
    () =>
      shuffleAssessmentDisplay(
        part.activity.titleOptions,
        `${shuffleSeed}:${part.id}:titles`,
      ),
    [part.activity.titleOptions, part.id, shuffleSeed],
  );

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border-2 border-sky-200 bg-sky-50 p-4">
        <p className="text-xs font-black uppercase tracking-[0.15em] text-sky-800">
          Word bank
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {words.map((item) => (
            <span
              key={item.id}
              className="rounded-full border-2 border-sky-200 bg-white px-3 py-1 font-extrabold text-slate-800"
            >
              {item.word}
            </span>
          ))}
        </div>
      </div>
      <article className="rounded-2xl border-2 border-slate-200 bg-white p-5 sm:p-7">
        <h3 className="mb-5 text-xl font-black text-slate-900">
          {part.activity.storyTitle}
        </h3>
        <p className="whitespace-pre-wrap text-base font-semibold leading-[3.4rem] text-slate-800 sm:text-lg">
          {part.activity.segments.map((segment) =>
            segment.type === "text" ? (
              <span key={segment.id}>{segment.text}</span>
            ) : (
              <span key={segment.id} className="mx-1 inline-flex items-center gap-1">
                <span className="text-xs font-black text-teal-800">
                  ({gapNumber.get(segment.id)})
                </span>
                <select
                  aria-label={`Story gap ${gapNumber.get(segment.id)}`}
                  value={answers[segment.id] ?? ""}
                  onChange={(event) => onAnswer(segment.id, event.target.value)}
                  className="min-h-11 rounded-lg border-2 border-teal-600 bg-teal-50 px-2 text-base font-black text-slate-900 focus:outline-none"
                >
                  <option value="">Choose</option>
                  {words.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.word}
                    </option>
                  ))}
                </select>
              </span>
            ),
          )}
        </p>
      </article>
      <fieldset className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5">
        <legend className="px-2 text-lg font-black text-slate-900">
          Choose the best title for the story.
        </legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {titleOptions.map((option) => {
            const checked =
              answers[part.activity.titleQuestionId] === option.id;
            return (
              <label
                key={option.id}
                className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border-2 bg-white p-3 font-bold ${
                  checked
                    ? "border-teal-600 text-teal-950"
                    : "border-amber-200 text-slate-700 hover:border-teal-300"
                }`}
              >
                <input
                  type="radio"
                  name={part.activity.titleQuestionId}
                  checked={checked}
                  onChange={() =>
                    onAnswer(part.activity.titleQuestionId, option.id)
                  }
                  className="h-5 w-5 shrink-0 accent-teal-700"
                />
                {option.text}
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

function ListeningButton({
  text,
  audioUrl,
  label = "Play recording",
}: {
  text: string;
  audioUrl?: string;
  label?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const stopAll = () => {
    window.speechSynthesis?.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlaying(false);
  };

  const play = () => {
    const clip = audioUrl?.trim();
    if (clip) {
      stopAll();
      const audio = new Audio(clip);
      audioRef.current = audio;
      audio.onended = () => {
        setPlaying(false);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setPlaying(false);
        audioRef.current = null;
        setUnavailable(true);
      };
      setUnavailable(false);
      setPlaying(true);
      void audio.play().catch(() => {
        setPlaying(false);
        audioRef.current = null;
        setUnavailable(true);
      });
      return;
    }
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setUnavailable(true);
      return;
    }
    stopAll();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-GB";
    utterance.rate = 0.88;
    utterance.pitch = 1;
    utterance.onstart = () => setPlaying(true);
    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => setPlaying(false);
    setUnavailable(false);
    setPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div>
      <button
        type="button"
        onClick={play}
        className="inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-[#17375e] bg-[#ffd34f] px-4 font-black text-[#17375e] hover:bg-[#ffca22]"
      >
        <Volume2 className={`h-5 w-5 ${playing ? "animate-pulse" : ""}`} />
        {playing ? "Playing…" : label}
      </button>
      {unavailable ? (
        <p className="mt-2 text-sm font-bold text-red-700">
          Audio is unavailable in this browser. Please ask your teacher for help.
        </p>
      ) : null}
    </div>
  );
}

function ListeningCharacterMatchPart({
  part,
  answers,
  onAnswer,
  shuffleSeed,
}: PartProps<Extract<AssessmentPart, { kind: "listening_character_match" }>>) {
  const { targets, image } = part.activity;
  const names = useMemo(
    () =>
      shuffleAssessmentDisplay(
        part.activity.names,
        `${shuffleSeed}:${part.id}:names`,
      ),
    [part.activity.names, part.id, shuffleSeed],
  );
  const [activeNameId, setActiveNameId] = useState(names[0]?.id ?? "");
  const layoutRef = useRef<HTMLDivElement>(null);
  const nameRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const targetRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [lines, setLines] = useState<
    Array<{ nameId: string; targetId: string; x1: number; y1: number; x2: number; y2: number }>
  >([]);

  useEffect(() => {
    if (!names.some((name) => name.id === activeNameId)) {
      setActiveNameId(names[0]?.id ?? "");
    }
  }, [activeNameId, names]);

  const matchedNameIds = useMemo(
    () => new Set(Object.values(answers).filter(Boolean)),
    [answers],
  );

  useEffect(() => {
    const layout = layoutRef.current;
    if (!layout) return;

    const measure = () => {
      const root = layout.getBoundingClientRect();
      const next: Array<{
        nameId: string;
        targetId: string;
        x1: number;
        y1: number;
        x2: number;
        y2: number;
      }> = [];
      for (const target of targets) {
        const nameId = answers[target.id];
        if (!nameId) continue;
        const nameEl = nameRefs.current[nameId];
        const targetEl = targetRefs.current[target.id];
        if (!nameEl || !targetEl) continue;
        const nameBox = nameEl.getBoundingClientRect();
        const targetBox = targetEl.getBoundingClientRect();
        next.push({
          nameId,
          targetId: target.id,
          x1: nameBox.right - root.left,
          y1: nameBox.top + nameBox.height / 2 - root.top,
          x2: targetBox.left + targetBox.width / 2 - root.left,
          y2: targetBox.top + targetBox.height / 2 - root.top,
        });
      }
      setLines(next);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(layout);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [answers, targets]);

  const assignNameToTarget = (targetId: string) => {
    if (!activeNameId) return;
    for (const target of targets) {
      if (target.id !== targetId && answers[target.id] === activeNameId) {
        onAnswer(target.id, "");
      }
    }
    onAnswer(targetId, activeNameId);
  };

  const linkedCount = targets.filter((target) => Boolean(answers[target.id])).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ListeningButton
          text={part.activity.audioText}
          audioUrl={part.activity.audioUrl}
        />
        <span className="rounded-full bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">
          Linked {linkedCount}/{targets.length}
        </span>
      </div>
      <p className="text-sm font-bold text-slate-600">
        Tap a name, then tap a person in the picture to draw a line. Extra names
        are not used.
      </p>
      <div
        ref={layoutRef}
        className="relative grid gap-5 lg:grid-cols-[11rem_minmax(0,1fr)] lg:items-start"
      >
        <svg
          className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible"
          aria-hidden
        >
          {lines.map((line) => (
            <line
              key={`${line.nameId}-${line.targetId}`}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="#17375e"
              strokeWidth={3}
              strokeLinecap="round"
            />
          ))}
        </svg>
        <aside className="relative z-10 rounded-2xl border-2 border-sky-200 bg-sky-50 p-4 lg:sticky lg:top-28">
          <p className="text-xs font-black uppercase tracking-[0.15em] text-sky-800">
            Names
          </p>
          <div className="mt-3 grid gap-2">
            {names.map((name) => {
              const selected = name.id === activeNameId;
              const used = matchedNameIds.has(name.id);
              return (
                <button
                  key={name.id}
                  type="button"
                  ref={(node) => {
                    nameRefs.current[name.id] = node;
                  }}
                  aria-pressed={selected}
                  onClick={() => setActiveNameId(name.id)}
                  className={`min-h-12 rounded-xl border-2 bg-white px-3 text-left font-black text-slate-800 ${
                    selected
                      ? "border-[#17375e] shadow-md"
                      : used
                        ? "border-teal-500 text-teal-900"
                        : "border-sky-100 hover:border-sky-400"
                  }`}
                >
                  {name.name}
                  {used ? " · linked" : ""}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => targets.forEach((target) => onAnswer(target.id, ""))}
            className="mt-4 min-h-11 w-full rounded-xl border-2 border-slate-300 bg-white px-3 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            Clear lines
          </button>
        </aside>
        <div className="relative z-10">
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border-4 border-[#17375e] bg-white">
            <Image
              src={image.src}
              alt={image.alt}
              fill
              className="object-contain"
              priority
              sizes="(max-width: 1024px) 100vw, 70vw"
            />
            {targets.map((target) => {
              const nameId = answers[target.id];
              const linkedName = names.find((name) => name.id === nameId);
              return (
                <button
                  key={target.id}
                  type="button"
                  ref={(node) => {
                    targetRefs.current[target.id] = node;
                  }}
                  onClick={() => assignNameToTarget(target.id)}
                  aria-label={
                    linkedName
                      ? `${target.label}: ${linkedName.name}`
                      : `Person ${target.label}`
                  }
                  className={`absolute z-10 flex min-h-11 min-w-11 items-center justify-center border-4 border-dashed transition hover:bg-amber-200/30 focus:outline-none focus:ring-4 focus:ring-amber-400 ${
                    linkedName
                      ? "border-teal-600 bg-teal-400/20"
                      : "border-[#17375e] bg-white/10"
                  }`}
                  style={{
                    left: `${target.xPercent}%`,
                    top: `${target.yPercent}%`,
                    width: `${target.widthPercent}%`,
                    height: `${target.heightPercent}%`,
                  }}
                >
                  <span className="rounded bg-white/95 px-1.5 py-0.5 text-[10px] font-black text-slate-900 shadow-sm sm:text-xs">
                    {target.label}
                    {linkedName ? ` · ${linkedName.name}` : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ListeningInformationPart({ part, answers, onAnswer }: PartProps<Extract<AssessmentPart, { kind: "listening_information" }>>) {
  return <div className="mx-auto max-w-3xl space-y-5"><ListeningButton text={part.activity.audioText} audioUrl={part.activity.audioUrl} /><section className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white"><div className="bg-[#17375e] p-5 text-center text-xl font-black text-white">{part.activity.organizerTitle}</div><div className="grid gap-0 sm:grid-cols-2">{part.activity.fields.map((field) => <label key={field.id} className="border-b-2 border-slate-100 p-5 odd:sm:border-r-2"><span className="block text-sm font-black leading-6 text-slate-800">{field.label}</span><input type="text" autoComplete="off" spellCheck={false} value={answers[field.id] ?? ""} onChange={(event) => onAnswer(field.id, event.target.value)} className="mt-3 min-h-12 w-full rounded-xl border-2 border-slate-300 px-3 font-bold text-slate-900 focus:border-teal-600 focus:outline-none" /></label>)}</div></section></div>;
}

function ListeningItemMatchPart({
  part,
  answers,
  onAnswer,
  shuffleSeed,
}: PartProps<Extract<AssessmentPart, { kind: "listening_item_match" }>>) {
  const choices = useMemo(
    () =>
      shuffleAssessmentDisplay(
        part.activity.choices,
        `${shuffleSeed}:${part.id}:choices`,
      ),
    [part.activity.choices, part.id, shuffleSeed],
  );

  return (
    <div className="space-y-5">
      <ListeningButton
        text={part.activity.audioText}
        audioUrl={part.activity.audioUrl}
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] lg:items-start">
        <section className="grid gap-3 sm:grid-cols-2">
          {choices.map((choice, index) => (
            <div
              key={choice.id}
              className="flex items-center gap-3 rounded-2xl border-2 border-sky-100 bg-white p-3"
            >
              {choice.imageSrc ? (
                <Image
                  src={choice.imageSrc}
                  alt=""
                  width={150}
                  height={110}
                  className="h-20 w-24 rounded-xl object-contain"
                />
              ) : (
                <div className="flex h-20 w-24 items-center justify-center rounded-xl bg-slate-100 text-3xl">
                  📷
                </div>
              )}
              <p className="font-bold text-slate-800">
                <span className="mr-2 font-black text-sky-700">
                  {String.fromCharCode(65 + index)}.
                </span>
                {choice.label}
              </p>
            </div>
          ))}
        </section>
        <section className="space-y-3 rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 lg:sticky lg:top-28">
          {part.activity.prompts.map((prompt) => (
            <label key={prompt.id} className="block rounded-xl bg-white p-3">
              <span className="font-black text-slate-900">{prompt.label}</span>
              <select
                aria-label={`Activity for ${prompt.label}`}
                value={answers[prompt.id] ?? ""}
                onChange={(event) => onAnswer(prompt.id, event.target.value)}
                className="mt-2 min-h-12 w-full rounded-xl border-2 border-slate-300 bg-white px-2 font-bold text-slate-900 focus:border-teal-600 focus:outline-none"
              >
                <option value="">Choose an activity</option>
                {choices.map((choice, index) => (
                  <option key={choice.id} value={choice.id}>
                    {String.fromCharCode(65 + index)}. {choice.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </section>
      </div>
    </div>
  );
}

function ListeningPictureChoicePart({
  part,
  answers,
  onAnswer,
  shuffleSeed,
}: PartProps<Extract<AssessmentPart, { kind: "listening_picture_choice" }>>) {
  const choicesByItem = useMemo(() => {
    const map: Record<
      string,
      (typeof part.activity.items)[number]["choices"]
    > = {};
    for (const item of part.activity.items) {
      map[item.id] = shuffleAssessmentDisplay(
        item.choices,
        `${shuffleSeed}:${part.id}:${item.id}:pics`,
      );
    }
    return map;
  }, [part.activity.items, part.id, shuffleSeed]);

  return (
    <div className="space-y-6">
      {part.activity.items.map((item, index) => (
        <fieldset
          key={item.id}
          className="rounded-2xl border-2 border-slate-200 bg-white p-4 sm:p-5"
        >
          <legend className="px-2 text-lg font-black text-slate-900">
            Question {index + 1}
          </legend>
          <ListeningButton
            text={item.audioText}
            audioUrl={item.audioUrl}
            label={`Play question ${index + 1}`}
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {(choicesByItem[item.id] ?? item.choices).map((choice) => {
              const checked = answers[item.id] === choice.id;
              return (
                <label
                  key={choice.id}
                  className={`relative cursor-pointer overflow-hidden rounded-2xl border-4 bg-white p-2 transition ${
                    checked
                      ? "border-teal-600 shadow-lg"
                      : "border-slate-200 hover:border-teal-300"
                  }`}
                >
                  <input
                    type="radio"
                    name={item.id}
                    checked={checked}
                    onChange={() => onAnswer(item.id, choice.id)}
                    className="sr-only"
                  />
                  <span className="absolute left-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[#17375e] font-black text-white">
                    {choice.label}
                  </span>
                  <Image
                    src={choice.imageSrc}
                    alt={choice.imageAlt}
                    width={600}
                    height={420}
                    className="aspect-[4/3] w-full rounded-xl object-contain"
                  />
                  <span className="sr-only">Choose picture {choice.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

function ListeningColourPicturePart({
  part,
  answers,
  onAnswer,
  shuffleSeed,
}: PartProps<Extract<AssessmentPart, { kind: "listening_colour_picture" }>>) {
  const palette = useMemo(
    () =>
      shuffleAssessmentDisplay(
        part.activity.palette,
        `${shuffleSeed}:${part.id}:palette`,
      ),
    [part.activity.palette, part.id, shuffleSeed],
  );
  const [activeColourId, setActiveColourId] = useState(palette[0]?.id ?? "");
  const activeColour = palette.find((colour) => colour.id === activeColourId);

  useEffect(() => {
    if (!palette.some((colour) => colour.id === activeColourId)) {
      setActiveColourId(palette[0]?.id ?? "");
    }
  }, [activeColourId, palette]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ListeningButton
          text={part.activity.audioText}
          audioUrl={part.activity.audioUrl}
        />
        <span className="rounded-full bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">
          Coloured{" "}
          {
            part.activity.targets.filter((target) => Boolean(answers[target.id]))
              .length
          }
          /{part.activity.targets.length}
        </span>
      </div>
      <div className="grid gap-5 lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start">
        <aside className="rounded-2xl border-2 border-sky-200 bg-sky-50 p-4 lg:sticky lg:top-28">
          <p className="text-xs font-black uppercase tracking-[0.15em] text-sky-800">
            Choose a colour
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-1">
            {palette.map((colour) => {
              const selected = colour.id === activeColourId;
              return (
                <button
                  key={colour.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setActiveColourId(colour.id)}
                  className={`flex min-h-12 items-center gap-3 rounded-xl border-2 bg-white px-3 font-black text-slate-800 ${
                    selected
                      ? "border-[#17375e] shadow-md"
                      : "border-sky-100 hover:border-sky-400"
                  }`}
                >
                  <span
                    className="h-7 w-7 rounded-full border-2 border-slate-500"
                    style={{ backgroundColor: colour.hex }}
                    aria-hidden
                  />
                  {colour.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() =>
              part.activity.targets.forEach((target) => onAnswer(target.id, ""))
            }
            className="mt-4 min-h-11 w-full rounded-xl border-2 border-slate-300 bg-white px-3 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            Clear colours
          </button>
        </aside>
        <div>
          <p className="mb-3 text-sm font-bold text-slate-600">
            Selected:{" "}
            <span className="font-black text-slate-900">
              {activeColour?.label ?? "Choose a colour"}
            </span>
            . Tap an outlined object to colour it.
          </p>
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border-4 border-[#17375e] bg-white">
            <Image
              src={part.activity.image.src}
              alt={part.activity.image.alt}
              fill
              className="object-contain"
              priority
            />
            {part.activity.targets.map((target) => {
              const answer = answers[target.id];
              const colour = palette.find((item) => item.id === answer);
              return (
                <button
                  key={target.id}
                  type="button"
                  onClick={() =>
                    activeColourId && onAnswer(target.id, activeColourId)
                  }
                  aria-label={`Colour ${target.label}${
                    colour ? `, currently ${colour.label}` : ""
                  }`}
                  className="absolute flex min-h-11 min-w-11 items-center justify-center border-4 border-dashed border-[#17375e] transition hover:bg-white/30 focus:outline-none focus:ring-4 focus:ring-amber-400"
                  style={{
                    left: `${target.xPercent}%`,
                    top: `${target.yPercent}%`,
                    width: `${target.widthPercent}%`,
                    height: `${target.heightPercent}%`,
                    backgroundColor: colour ? `${colour.hex}99` : "transparent",
                  }}
                >
                  <span
                    className={`rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-black text-slate-900 shadow-sm sm:text-xs ${
                      colour ? "opacity-100" : "opacity-75"
                    }`}
                  >
                    {target.label}
                    {colour ? ` · ${colour.label}` : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

type SpeakingProps<T extends AssessmentPart> = PartProps<T> & { homeworkId?: string; recording?: AssessmentSpeakingRecording; onRecordingSaved: (recording: AssessmentSpeakingRecording) => void };

function SpeakingPictureDifferencesPart({ part, onAnswer, homeworkId, recording, onRecordingSaved }: SpeakingProps<Extract<AssessmentPart, { kind: "speaking_picture_differences" }>>) {
  return <div className="space-y-5"><p className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 font-bold leading-7 text-slate-800">{part.activity.prompt}</p><div className="grid gap-4 md:grid-cols-2">{part.activity.images.map((image) => <figure key={image.src} className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white p-3"><figcaption className="mb-2 text-center text-sm font-black text-slate-700">{image.label}</figcaption><Image src={image.src} alt={image.alt} width={1200} height={675} className="aspect-video w-full rounded-xl object-contain" /></figure>)}</div><AssessmentSpeakingRecorder homeworkId={homeworkId} partId={part.id} responseId={part.activity.responseId} maxDurationSeconds={part.activity.maxDurationSeconds} initialRecording={recording} onSaved={(item) => { onRecordingSaved(item); onAnswer(part.activity.responseId, item.id); }} /></div>;
}

function SpeakingQuestionExchangePart({ part, onAnswer, homeworkId, recording, onRecordingSaved }: SpeakingProps<Extract<AssessmentPart, { kind: "speaking_question_exchange" }>>) {
  return <div className="space-y-5"><p className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 font-bold leading-7 text-slate-800">{part.activity.prompt}</p><div className="grid gap-4 md:grid-cols-2">{part.activity.cards.map((card) => <section key={card.id} className="rounded-2xl border-2 border-sky-200 bg-white p-5"><h3 className="text-lg font-black text-[#17375e]">{card.title}</h3><ul className="mt-3 space-y-2">{card.prompts.map((prompt) => <li key={prompt} className="rounded-xl bg-sky-50 px-3 py-2 font-bold text-slate-700">{prompt}</li>)}</ul></section>)}</div><AssessmentSpeakingRecorder homeworkId={homeworkId} partId={part.id} responseId={part.activity.responseId} maxDurationSeconds={part.activity.maxDurationSeconds} initialRecording={recording} onSaved={(item) => { onRecordingSaved(item); onAnswer(part.activity.responseId, item.id); }} /></div>;
}

function SpeakingPictureStoryPart({ part, onAnswer, homeworkId, recording, onRecordingSaved }: SpeakingProps<Extract<AssessmentPart, { kind: "speaking_picture_story" }>>) {
  return <div className="space-y-5"><p className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 font-bold leading-7 text-slate-800">{part.activity.prompt}</p><ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{part.activity.frames.map((frame, index) => <li key={frame.id} className="relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-white p-2"><span className="absolute left-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[#17375e] font-black text-white">{index + 1}</span><Image src={frame.src} alt={frame.alt} width={480} height={360} className="aspect-[4/3] w-full rounded-xl object-contain" /></li>)}</ol><AssessmentSpeakingRecorder homeworkId={homeworkId} partId={part.id} responseId={part.activity.responseId} maxDurationSeconds={part.activity.maxDurationSeconds} initialRecording={recording} onSaved={(item) => { onRecordingSaved(item); onAnswer(part.activity.responseId, item.id); }} /></div>;
}

function ClozeChoicePart({
  part,
  answers,
  onAnswer,
  shuffleSeed,
}: PartProps<Extract<AssessmentPart, { kind: "cloze_choice" }>>) {
  const gapNumber = new Map(
    listClozeChoiceGaps(part.activity.segments).map((gap, index) => [
      gap.id,
      index + 1,
    ]),
  );
  const optionsByGap = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const gap of listClozeChoiceGaps(part.activity.segments)) {
      map[gap.id] = shuffleAssessmentDisplay(
        gap.options,
        `${shuffleSeed}:${part.id}:${gap.id}:opts`,
      );
    }
    return map;
  }, [part.activity.segments, part.id, shuffleSeed]);

  return (
    <article className="rounded-2xl border-2 border-slate-200 bg-white p-5 sm:p-7">
      {part.activity.passageTitle ? (
        <h3 className="mb-5 text-xl font-black text-slate-900">
          {part.activity.passageTitle}
        </h3>
      ) : null}
      <p className="whitespace-pre-wrap text-base font-semibold leading-[3.25rem] text-slate-800 sm:text-lg">
        {part.activity.segments.map((segment) =>
          segment.type === "text" ? (
            <span key={segment.id}>{segment.text}</span>
          ) : (
            <span key={segment.id} className="mx-1 inline-flex items-center gap-1">
              <span className="text-xs font-black text-teal-800">
                ({gapNumber.get(segment.id)})
              </span>
              <select
                aria-label={`Gap ${gapNumber.get(segment.id)}`}
                value={answers[segment.id] ?? ""}
                onChange={(event) => onAnswer(segment.id, event.target.value)}
                className="min-h-11 rounded-lg border-2 border-teal-600 bg-teal-50 px-2 text-base font-black text-slate-900 focus:outline-none"
              >
                <option value="">Choose</option>
                {(optionsByGap[segment.id] ?? segment.options).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </span>
          ),
        )}
      </p>
    </article>
  );
}

function ClozeOpenPart({ part, answers, onAnswer }: PartProps<Extract<AssessmentPart, { kind: "cloze_open" }>>) {
  const gapNumber = new Map(listClozeOpenGaps(part.activity.segments).map((gap, index) => [gap.id, index + 1]));
  return <article className="rounded-2xl border-2 border-slate-200 bg-white p-5 sm:p-7">
    {part.activity.passageTitle ? <h3 className="mb-5 text-xl font-black text-slate-900">{part.activity.passageTitle}</h3> : null}
    <p className="whitespace-pre-wrap text-base font-semibold leading-[3.4rem] text-slate-800 sm:text-lg">{part.activity.segments.map((segment) => segment.type === "text" ? <span key={segment.id}>{segment.text}</span> : <span key={segment.id} className="mx-1 inline-flex items-center gap-1">
      <span className="text-xs font-black text-teal-800">({gapNumber.get(segment.id)})</span>
      <input type="text" autoComplete="off" spellCheck={false} aria-label={`Gap ${gapNumber.get(segment.id)}`} value={answers[segment.id] ?? ""} onChange={(event) => onAnswer(segment.id, event.target.value)} className="h-11 w-24 rounded-lg border-2 border-teal-600 bg-teal-50 px-2 text-center text-base font-black text-slate-900 focus:outline-none" />
    </span>)}</p>
  </article>;
}

function PartBody({
  part,
  answers,
  onAnswer,
  shuffleSeed,
  homeworkId,
  recording,
  onRecordingSaved,
}: PartProps<AssessmentPart> & {
  homeworkId?: string;
  recording?: AssessmentSpeakingRecording;
  onRecordingSaved: (recording: AssessmentSpeakingRecording) => void;
}) {
  if (part.kind === "definition_match")
    return (
      <DefinitionMatchPart
        part={part}
        answers={answers}
        onAnswer={onAnswer}
        shuffleSeed={shuffleSeed}
      />
    );
  if (part.kind === "read_and_answer")
    return (
      <ReadAndAnswerPart
        part={part}
        answers={answers}
        onAnswer={onAnswer}
        shuffleSeed={shuffleSeed}
      />
    );
  if (part.kind === "short_answer_reading")
    return (
      <ShortAnswerReadingPart
        part={part}
        answers={answers}
        onAnswer={onAnswer}
        shuffleSeed={shuffleSeed}
      />
    );
  if (part.kind === "picture_yes_no")
    return (
      <PictureYesNoPart
        part={part}
        answers={answers}
        onAnswer={onAnswer}
        shuffleSeed={shuffleSeed}
      />
    );
  if (part.kind === "dialogue_bank")
    return (
      <DialogueBankPart
        part={part}
        answers={answers}
        onAnswer={onAnswer}
        shuffleSeed={shuffleSeed}
      />
    );
  if (part.kind === "story_bank_title")
    return (
      <StoryBankTitlePart
        part={part}
        answers={answers}
        onAnswer={onAnswer}
        shuffleSeed={shuffleSeed}
      />
    );
  if (part.kind === "listening_character_match")
    return (
      <ListeningCharacterMatchPart
        part={part}
        answers={answers}
        onAnswer={onAnswer}
        shuffleSeed={shuffleSeed}
      />
    );
  if (part.kind === "listening_information")
    return (
      <ListeningInformationPart
        part={part}
        answers={answers}
        onAnswer={onAnswer}
        shuffleSeed={shuffleSeed}
      />
    );
  if (part.kind === "listening_item_match")
    return (
      <ListeningItemMatchPart
        part={part}
        answers={answers}
        onAnswer={onAnswer}
        shuffleSeed={shuffleSeed}
      />
    );
  if (part.kind === "listening_picture_choice")
    return (
      <ListeningPictureChoicePart
        part={part}
        answers={answers}
        onAnswer={onAnswer}
        shuffleSeed={shuffleSeed}
      />
    );
  if (part.kind === "listening_colour_picture")
    return (
      <ListeningColourPicturePart
        part={part}
        answers={answers}
        onAnswer={onAnswer}
        shuffleSeed={shuffleSeed}
      />
    );
  if (part.kind === "speaking_picture_differences")
    return (
      <SpeakingPictureDifferencesPart
        part={part}
        answers={answers}
        onAnswer={onAnswer}
        shuffleSeed={shuffleSeed}
        homeworkId={homeworkId}
        recording={recording}
        onRecordingSaved={onRecordingSaved}
      />
    );
  if (part.kind === "speaking_question_exchange")
    return (
      <SpeakingQuestionExchangePart
        part={part}
        answers={answers}
        onAnswer={onAnswer}
        shuffleSeed={shuffleSeed}
        homeworkId={homeworkId}
        recording={recording}
        onRecordingSaved={onRecordingSaved}
      />
    );
  if (part.kind === "speaking_picture_story")
    return (
      <SpeakingPictureStoryPart
        part={part}
        answers={answers}
        onAnswer={onAnswer}
        shuffleSeed={shuffleSeed}
        homeworkId={homeworkId}
        recording={recording}
        onRecordingSaved={onRecordingSaved}
      />
    );
  if (part.kind === "cloze_choice")
    return (
      <ClozeChoicePart
        part={part}
        answers={answers}
        onAnswer={onAnswer}
        shuffleSeed={shuffleSeed}
      />
    );
  return (
    <ClozeOpenPart
      part={part}
      answers={answers}
      onAnswer={onAnswer}
      shuffleSeed={shuffleSeed}
    />
  );
}

export function PrimaryA2AssessmentPilot({
  definition: definitionProp,
  mode = "student",
  focusPartId = null,
  homeworkId,
  initialAttempt,
  initialSpeakingRecordings = [],
  speakingReview = null,
}: {
  /** Defaults to the Primary A2 fixture when omitted (pilot route / class assign). */
  definition?: AssessmentDefinition;
  /** Compiler embed: no persistence, start in progress, contained layout. */
  mode?: "student" | "authoring-preview";
  /** Jump to this part id while authoring. */
  focusPartId?: string | null;
  homeworkId?: string;
  initialAttempt?: AssessmentAttempt | null;
  initialSpeakingRecordings?: AssessmentSpeakingRecording[];
  speakingReview?: AssessmentSpeakingReview | null;
} = {}) {
  const definition = useMemo(
    () =>
      normalizeAssessmentDefinition(
        definitionProp ?? PRIMARY_A2_ASSESSMENT_PILOT,
      ),
    [definitionProp],
  );
  const authoringPreview = mode === "authoring-preview";
  const parts = useMemo(() => listAssessmentParts(definition), [definition]);
  const sectionByPartId = useMemo(
    () =>
      new Map(
        definition.sections.flatMap((section) =>
          section.parts.map((part) => [part.id, section.title] as const),
        ),
      ),
    [definition],
  );
  const storageKey = useMemo(
    () => assessmentAttemptStorageKey(definition),
    [definition],
  );
  const [attempt, setAttempt] = useState<AssessmentAttempt>(() => {
    if (authoringPreview) {
      const now = new Date().toISOString();
      const base = newAttempt(definition);
      const partIds = listAssessmentParts(definition).map((part) => part.id);
      const startPartId =
        focusPartId && partIds.includes(focusPartId)
          ? focusPartId
          : base.activePartId;
      return {
        ...base,
        status: "in_progress",
        startedAt: now,
        updatedAt: now,
        activePartId: startPartId,
      };
    }
    const base = initialAttempt ?? newAttempt(definition);
    if (!initialSpeakingRecordings.length || base.status === "submitted") return base;
    const responses = { ...base.responses };
    for (const recording of initialSpeakingRecordings) {
      responses[recording.partId] = {
        ...(responses[recording.partId] ?? {}),
        [recording.responseId]: recording.id,
      };
    }
    return { ...base, responses };
  });
  const [ready, setReady] = useState(authoringPreview);
  const [screen, setScreen] = useState<"test" | "review">("test");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [speakingRecordings, setSpeakingRecordings] = useState(
    () => new Map(initialSpeakingRecordings.map((item) => [item.partId, item])),
  );

  useEffect(() => {
    if (authoringPreview || homeworkId) {
      setReady(true);
      return;
    }
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as AssessmentAttempt;
        if (
          parsed.definitionId === definition.id &&
          parsed.contentVersion === definition.contentVersion
        ) {
          setAttempt(parsed);
        }
      }
    } catch {
      /* A damaged local draft must not block the test. */
    } finally {
      setReady(true);
    }
  }, [authoringPreview, definition.contentVersion, definition.id, homeworkId, storageKey]);

  useEffect(() => {
    if (!ready || homeworkId || authoringPreview) return;
    window.localStorage.setItem(storageKey, JSON.stringify(attempt));
  }, [attempt, authoringPreview, homeworkId, ready, storageKey]);

  useEffect(() => {
    if (!homeworkId || !ready || attempt.status !== "in_progress" || authoringPreview) {
      return;
    }
    setSaveState("saving");
    const timer = window.setTimeout(() => {
      void savePrimaryA2AssessmentAttempt({
        homeworkId,
        activePartId: attempt.activePartId,
        responses: attempt.responses,
      }).then((result) => setSaveState(result.ok ? "saved" : "error"));
    }, 650);
    return () => window.clearTimeout(timer);
  }, [
    attempt.activePartId,
    attempt.responses,
    attempt.status,
    authoringPreview,
    homeworkId,
    ready,
  ]);

  useEffect(() => {
    if (!authoringPreview || !focusPartId) return;
    if (!parts.some((part) => part.id === focusPartId)) return;
    setAttempt((current) =>
      current.activePartId === focusPartId
        ? current
        : {
            ...current,
            activePartId: focusPartId,
            updatedAt: new Date().toISOString(),
          },
    );
    setScreen("test");
  }, [authoringPreview, focusPartId, parts]);

  const progress = assessmentProgress(definition, attempt.responses);
  const activeIndex = Math.max(
    0,
    parts.findIndex((part) => part.id === attempt.activePartId),
  );
  const activePart = parts[activeIndex] ?? parts[0];
  const activeSectionTitle = activePart
    ? (sectionByPartId.get(activePart.id) ?? "Assessment")
    : "Assessment";
  const openPart = (partId: string) => {
    setAttempt((current) => ({
      ...current,
      activePartId: partId,
      updatedAt: new Date().toISOString(),
    }));
    setScreen("test");
    if (!authoringPreview) window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const updateAnswer = (itemId: string, answer: string) => {
    if (!activePart || attempt.status !== "in_progress") return;
    setAttempt((current) => ({
      ...current,
      responses: {
        ...current.responses,
        [activePart.id]: {
          ...(current.responses[activePart.id] ?? {}),
          [itemId]: answer,
        },
      },
      updatedAt: new Date().toISOString(),
    }));
  };
  const submitAttempt = async () => {
    if (
      !window.confirm(
        authoringPreview
          ? "Preview submit? This only shows the end report in the compiler."
          : "Submit this assessment? You will not be able to change your answers.",
      )
    ) {
      return;
    }
    const now = new Date().toISOString();
    if (homeworkId && !authoringPreview) {
      setSaveState("saving");
      const result = await savePrimaryA2AssessmentAttempt({
        homeworkId,
        activePartId: attempt.activePartId,
        responses: attempt.responses,
        submit: true,
      });
      if (!result.ok) {
        setSaveState("error");
        window.alert(result.error);
        return;
      }
      setAttempt(result.attempt);
      setSaveState("saved");
      return;
    }
    setAttempt((current) => ({
      ...current,
      status: "submitted",
      submittedAt: now,
      updatedAt: now,
    }));
  };

  const resetAuthoringPreview = () => {
    const now = new Date().toISOString();
    const base = newAttempt(definition);
    setAttempt({
      ...base,
      status: "in_progress",
      startedAt: now,
      updatedAt: now,
      activePartId:
        focusPartId && parts.some((part) => part.id === focusPartId)
          ? focusPartId
          : base.activePartId,
    });
    setScreen("test");
    setSpeakingRecordings(new Map());
  };

  const shellClass = authoringPreview
    ? "relative flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50"
    : "min-h-screen bg-slate-50 pb-28";
  const headerClass = authoringPreview
    ? "shrink-0 border-b-2 border-slate-200 bg-white"
    : "sticky top-0 z-20 border-b-2 border-slate-200 bg-white/95 shadow-sm backdrop-blur";
  const navClass = authoringPreview
    ? "shrink-0 border-t-2 border-slate-200 bg-white px-3 py-2"
    : "fixed inset-x-0 bottom-0 z-20 border-t-2 border-slate-200 bg-white px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)]";

  if (!ready) {
    return (
      <div className="mx-auto max-w-4xl p-8 text-center text-lg font-black text-slate-700">
        Opening your assessment…
      </div>
    );
  }

  if (attempt.status === "not_started") {
    return (
      <main
        className={
          authoringPreview
            ? "min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,#ecfeff_0%,#fff7ed_55%,#ffffff_100%)] px-4 py-6"
            : "min-h-screen bg-[linear-gradient(180deg,#ecfeff_0%,#fff7ed_55%,#ffffff_100%)] px-4 py-8 sm:py-14"
        }
      >
        <section className="mx-auto max-w-3xl overflow-hidden rounded-[2rem] border-4 border-[#17375e] bg-white shadow-[0_18px_0_rgba(23,55,94,0.12)]">
          <div className="bg-[#17375e] px-6 py-7 text-white sm:px-10">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
              Assessment pilot · {definition.level}
            </p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">{definition.title}</h1>
            <p className="mt-3 font-semibold text-slate-200">{definition.audience}</p>
          </div>
          <div className="p-6 sm:p-10">
            <div className="grid gap-3 sm:grid-cols-3">
              <InfoCard
                icon={<BookOpenCheck />}
                title="Listening, Reading + Speaking"
                detail={`${parts.length} parts`}
                tone="cyan"
              />
              <InfoCard
                icon={<ClipboardCheck />}
                title={`${progress.total} responses`}
                detail="Review before sending"
                tone="amber"
              />
              <InfoCard
                icon={<Clock3 />}
                title={`About ${definition.estimatedMinutes} min`}
                detail="Work at your pace"
                tone="violet"
              />
            </div>
            <div className="mt-7 rounded-2xl border-2 border-slate-200 p-5">
              <h2 className="font-black text-slate-900">Before you begin</h2>
              <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-slate-700">
                <li>• Your work saves automatically on this device.</li>
                <li>• Use headphones and check that your microphone works.</li>
                <li>• You can move between parts and return to unanswered questions.</li>
                <li>• You will review everything before the final submission.</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => {
                const now = new Date().toISOString();
                setAttempt((current) => ({
                  ...current,
                  status: "in_progress",
                  startedAt: now,
                  updatedAt: now,
                }));
              }}
              className="mt-7 min-h-14 w-full rounded-2xl border-2 border-[#17375e] bg-[#ffd34f] px-6 text-lg font-black text-[#17375e] transition hover:bg-[#ffca22]"
            >
              Start assessment
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (attempt.status === "submitted") {
    return (
      <main
        className={
          authoringPreview
            ? "min-h-0 flex-1 overflow-y-auto bg-emerald-50 px-4 py-8"
            : "min-h-screen bg-emerald-50 px-4 py-12"
        }
      >
        <section className="mx-auto max-w-4xl rounded-[2rem] border-4 border-emerald-800 bg-white p-7 text-center shadow-xl sm:p-12">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
            <Check className="h-11 w-11" />
          </span>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
            Assessment submitted
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">
            Well done—you finished this section.
          </h1>
          <p className="mx-auto mt-4 max-w-lg font-semibold leading-7 text-slate-600">
            You answered {progress.answered} of {progress.total} questions.{" "}
            {homeworkId && !authoringPreview
              ? "Your teacher can now see your result."
              : authoringPreview
                ? "Authoring preview only — nothing was assigned."
                : "In the production test, your teacher will receive the submitted attempt for reporting."}
          </p>
          <StudentAssessmentReport
            definition={definition}
            progress={progress}
            speakingReview={speakingReview}
          />
          {!homeworkId || authoringPreview ? (
            <>
              {!authoringPreview ? (
                <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">
                  Pilot note: this attempt is saved only in this browser.
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  if (authoringPreview) {
                    resetAuthoringPreview();
                    return;
                  }
                  window.localStorage.removeItem(storageKey);
                  setAttempt(newAttempt(definition));
                  setScreen("test");
                }}
                className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-5 font-black text-slate-800 hover:bg-slate-50"
              >
                <RotateCcw className="h-5 w-5" />{" "}
                {authoringPreview ? "Reset preview" : "Reset pilot"}
              </button>
            </>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className={shellClass}>
      <header className={headerClass}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-teal-700">
              Primary A2 · {activeSectionTitle}
            </p>
            <h1 className="text-lg font-black text-slate-900">
              {screen === "review"
                ? "Review your answers"
                : `Part ${activePart?.partNumber}: ${activePart?.title}`}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {!authoringPreview ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500">
                <Save
                  className={`h-4 w-4 ${saveState === "error" ? "text-red-600" : "text-emerald-600"}`}
                />{" "}
                {saveState === "saving"
                  ? "Saving…"
                  : saveState === "error"
                    ? "Save failed"
                    : "Saved"}
              </span>
            ) : null}
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-800">
              {progress.answered}/{progress.total}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-teal-600 transition-all"
              style={{
                width: `${progress.total ? (progress.answered / progress.total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </header>
      <div className={authoringPreview ? "min-h-0 flex-1 overflow-y-auto" : undefined}>
        {screen === "review" ? (
          <ReviewScreen
            parts={parts}
            sectionByPartId={sectionByPartId}
            progress={progress}
            openPart={openPart}
            onSubmit={() => void submitAttempt()}
          />
        ) : activePart ? (
          <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
            <div className="mb-5 rounded-2xl border-2 border-teal-200 bg-teal-50 p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-800">
                {activeSectionTitle} · Part {activePart.partNumber}
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">{activePart.title}</h2>
              <p className="mt-2 font-semibold text-slate-700">{activePart.instructions}</p>
            </div>
            <PartBody
              part={activePart}
              answers={attempt.responses[activePart.id] ?? {}}
              onAnswer={updateAnswer}
              shuffleSeed={attempt.attemptId}
              homeworkId={authoringPreview ? undefined : homeworkId}
              recording={speakingRecordings.get(activePart.id)}
              onRecordingSaved={(recording) =>
                setSpeakingRecordings((current) =>
                  new Map(current).set(recording.partId, recording),
                )
              }
            />
          </section>
        ) : null}
      </div>
      <nav className={navClass} aria-label="Assessment navigation">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2">
          <button
            type="button"
            aria-label="Previous part"
            disabled={screen === "review" || activeIndex === 0}
            onClick={() => openPart(parts[activeIndex - 1]!.id)}
            className="inline-flex min-h-12 items-center gap-1 rounded-xl border-2 border-slate-300 bg-white px-3 font-black text-slate-800 disabled:opacity-40"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="hidden sm:inline">Previous</span>
          </button>
          <div className="hidden items-center gap-1 md:flex">
            {parts.map((part, index) => (
              <button
                key={part.id}
                type="button"
                onClick={() => openPart(part.id)}
                aria-label={`Open ${sectionByPartId.get(part.id)} part ${part.partNumber}`}
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-black ${
                  screen === "test" && index === activeIndex
                    ? "border-[#17375e] bg-[#ffd34f] text-[#17375e]"
                    : progress.parts[part.id].answered === progress.parts[part.id].total
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                      : "border-slate-300 bg-white text-slate-600"
                }`}
              >
                {part.partNumber}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setScreen("review")}
            className="min-h-12 rounded-xl border-2 border-slate-300 bg-white px-4 font-black text-slate-800"
          >
            Review
          </button>
          <button
            type="button"
            aria-label="Next part"
            disabled={screen === "review" || activeIndex >= parts.length - 1}
            onClick={() => openPart(parts[activeIndex + 1]!.id)}
            className="inline-flex min-h-12 items-center gap-1 rounded-xl border-2 border-[#17375e] bg-[#17375e] px-3 font-black text-white disabled:opacity-40"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </nav>
    </main>
  );
}

function InfoCard({ icon, title, detail, tone }: { icon: React.ReactNode; title: string; detail: string; tone: "cyan" | "amber" | "violet" }) {
  const colors = { cyan: "bg-cyan-50 text-teal-700", amber: "bg-amber-50 text-amber-700", violet: "bg-violet-50 text-violet-700" }[tone];
  return <div className={`rounded-2xl p-4 ${colors}`}><span className="block [&_svg]:h-7 [&_svg]:w-7">{icon}</span><p className="mt-2 text-sm font-black text-slate-900">{title}</p><p className="text-sm font-semibold text-slate-600">{detail}</p></div>;
}

function StudentAssessmentReport({
  definition,
  progress,
  speakingReview,
}: {
  definition: AssessmentDefinition;
  progress: ReturnType<typeof assessmentProgress>;
  speakingReview: AssessmentSpeakingReview | null;
}) {
  const section = definition.sections.find((item) => item.id === "reading-writing");
  const rows = (section?.parts ?? []).map((part) => ({
    part,
    score: progress.parts[part.id],
  }));
  const correct = rows.reduce((sum, row) => sum + row.score.correct, 0);
  const total = rows.reduce((sum, row) => sum + row.score.objectiveTotal, 0);
  const percent = total ? Math.round((correct / total) * 100) : 0;
  const message =
    percent >= 90
      ? "Excellent control of this level."
      : percent >= 75
        ? "Strong work with a few areas to review."
        : percent >= 60
          ? "Good progress—review the parts below and keep practising."
          : "This is a useful starting point. Your teacher will help you choose what to practise next.";
  return (
    <div className="mt-8 space-y-5 text-left">
      <section className="overflow-hidden rounded-2xl border-2 border-sky-200">
        <div className="grid gap-4 bg-sky-50 p-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
          <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full border-4 border-sky-700 bg-white text-sky-900">
            <strong className="text-3xl font-black">{percent}%</strong>
            <span className="text-xs font-black">
              {correct}/{total}
            </span>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-800">
              Reading &amp; Writing report
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">{message}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              This score is ready now because these questions can be checked automatically.
            </p>
          </div>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          {rows.map(({ part, score }) => {
            const partPercent = score.objectiveTotal
              ? Math.round((score.correct / score.objectiveTotal) * 100)
              : 0;
            return (
              <div key={part.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-sky-700">
                      Part {part.partNumber}
                    </p>
                    <h3 className="mt-1 font-black text-slate-900">{part.title}</h3>
                  </div>
                  <span className="shrink-0 rounded-full bg-sky-100 px-3 py-1 text-sm font-black text-sky-900">
                    {score.correct}/{score.objectiveTotal}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full ${
                      partPercent >= 75
                        ? "bg-emerald-500"
                        : partPercent >= 50
                          ? "bg-amber-500"
                          : "bg-rose-500"
                    }`}
                    style={{ width: `${partPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
      {speakingReview ? (
        <section className="rounded-2xl border-2 border-violet-300 bg-violet-50 p-5">
          <div className="flex gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-700 text-lg font-black text-white">
              {Object.values(speakingReview.scores).reduce(
                (sum, score) => sum + score,
                0,
              )}
              /15
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-800">
                Speaking report ready
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-900">
                Your teacher reviewed your recordings.
              </h2>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {["speaking-part-1", "speaking-part-2", "speaking-part-3"].map(
              (id, index) => (
                <div key={id} className="rounded-xl bg-white p-3 text-center">
                  <p className="text-xs font-bold text-slate-500">Part {index + 1}</p>
                  <p className="text-xl font-black text-violet-800">
                    {speakingReview.scores[id] ?? 0}/5
                  </p>
                </div>
              ),
            )}
          </div>
          {speakingReview.feedback ? (
            <div className="mt-4 rounded-xl bg-white p-4">
              <p className="text-xs font-black uppercase tracking-wide text-violet-700">
                Teacher feedback
              </p>
              <p className="mt-2 whitespace-pre-wrap font-semibold leading-7 text-slate-700">
                {speakingReview.feedback}
              </p>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="flex gap-4 rounded-2xl border-2 border-violet-200 bg-violet-50 p-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-700 text-white">
            <Clock3 className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-800">
              Speaking report pending
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-900">
              Your teacher will listen to your recordings.
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
              Speaking needs a teacher’s judgment, so feedback and your speaking result
              should be returned within one day.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

function ReviewScreen({ parts, sectionByPartId, progress, openPart, onSubmit }: { parts: AssessmentPart[]; sectionByPartId: Map<string, string>; progress: ReturnType<typeof assessmentProgress>; openPart: (id: string) => void; onSubmit: () => void }) {
  const missing = progress.total - progress.answered;
  return <section className="mx-auto max-w-4xl px-4 py-7 sm:px-6"><div className="rounded-2xl border-2 border-slate-200 bg-white p-5 sm:p-7"><h2 className="text-2xl font-black text-slate-900">Check every part before submitting</h2><p className="mt-2 font-semibold text-slate-600">You can return to any part. Correct answers are not shown during the test.</p></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{parts.map((part) => { const item = progress.parts[part.id]; const complete = item.answered === item.total; return <button key={part.id} type="button" onClick={() => openPart(part.id)} className="flex items-center justify-between gap-4 rounded-2xl border-2 border-slate-200 bg-white p-5 text-left transition hover:border-teal-500"><span><span className="text-xs font-black uppercase tracking-wide text-teal-700">{sectionByPartId.get(part.id)} · Part {part.partNumber}</span><span className="mt-1 block font-black text-slate-900">{part.title}</span><span className="mt-1 block text-sm font-semibold text-slate-500">{item.answered} of {item.total} answered</span></span><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${complete ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>{complete ? <Check className="h-5 w-5" /> : item.total - item.answered}</span></button>; })}</div>{missing > 0 ? <p className="mt-5 rounded-xl bg-amber-100 p-4 text-sm font-bold text-amber-900">You still have {missing} unanswered question{missing === 1 ? "" : "s"}. You may submit, but it is worth checking them first.</p> : null}<button type="button" onClick={onSubmit} className="mt-6 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#17375e] bg-[#ffd34f] px-6 text-lg font-black text-[#17375e] hover:bg-[#ffca22]"><Send className="h-5 w-5" /> Submit assessment</button></section>;
}
