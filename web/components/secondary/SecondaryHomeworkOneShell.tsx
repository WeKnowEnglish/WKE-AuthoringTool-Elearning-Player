"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  RotateCcw,
} from "lucide-react";
import { AssessmentSpeakingRecorder } from "@/components/assessment/AssessmentSpeakingRecorder";
import { recordHomeworkTemplateCompletion } from "@/lib/actions/class-homework";
import { saveHomeworkTemplatePart } from "@/lib/actions/homework-template-submission";
import type { AssessmentSpeakingRecording } from "@/lib/assessment";
import type { HomeworkTemplateSubmission } from "@/lib/homework-templates/homework-template-submission";
import { getHomeworkTemplateDefinition } from "@/lib/homework-templates/registry";
import {
  scoreSecondaryAnswers,
  scoreSequence,
  SECONDARY_HOMEWORK_ONE,
  sequenceAnswers,
  sequenceFromAnswers,
} from "@/lib/homework-templates/secondary-homework-one";

const TEMPLATE = getHomeworkTemplateDefinition("secondary-homework-template-one")!;
const PART_IDS = TEMPLATE.parts.map((part) => part.id);

type Props = {
  homeworkId?: string;
  alreadyCompleted?: boolean;
  homeHref?: string;
  initialSubmission?: HomeworkTemplateSubmission | null;
  initialRecording?: AssessmentSpeakingRecording;
};

function firstIncompletePart(submission?: HomeworkTemplateSubmission | null) {
  return PART_IDS.find((id) => !submission?.content.parts[id]) ?? PART_IDS[PART_IDS.length - 1]!;
}

function resultTone(correct: number, total: number) {
  if (correct === total) return "border-emerald-300 bg-emerald-50 text-emerald-900";
  if (correct >= Math.ceil(total * 0.7)) return "border-amber-300 bg-amber-50 text-amber-950";
  return "border-rose-300 bg-rose-50 text-rose-900";
}

export function SecondaryHomeworkOneShell({
  homeworkId,
  alreadyCompleted = false,
  homeHref = "/secondary",
  initialSubmission,
  initialRecording,
}: Props) {
  const router = useRouter();
  const initialParts = initialSubmission?.content.parts ?? {};
  const [activePartId, setActivePartId] = useState(() => firstIncompletePart(initialSubmission));
  const [savedParts, setSavedParts] = useState(() => new Set(Object.keys(initialParts)));
  const [sequence, setSequence] = useState(() => sequenceFromAnswers(initialParts["community-sequence"]?.answers ?? {}));
  const [corrections, setCorrections] = useState<Record<string, string>>(() => initialParts["past-corrections"]?.answers ?? {});
  const [dialogue, setDialogue] = useState<Record<string, string>>(() => initialParts["irregular-dialogue"]?.answers ?? {});
  const [questionChoices, setQuestionChoices] = useState<Record<string, string>>(() => initialParts["past-question-choice"]?.answers ?? {});
  const [recording, setRecording] = useState<AssessmentSpeakingRecording | undefined>(initialRecording);
  const [checkedScores, setCheckedScores] = useState<Record<string, number>>({});
  const [notice, setNotice] = useState(alreadyCompleted ? "This homework has already been submitted. You can review your answers below." : "");
  const [pending, startTransition] = useTransition();
  const activePart = TEMPLATE.parts.find((part) => part.id === activePartId) ?? TEMPLATE.parts[0]!;
  const activeIndex = TEMPLATE.parts.findIndex((part) => part.id === activePart.id);

  const correctionScore = useMemo(
    () => scoreSecondaryAnswers(corrections, SECONDARY_HOMEWORK_ONE.corrections.questions),
    [corrections],
  );
  const dialogueScore = useMemo(
    () => scoreSecondaryAnswers(dialogue, SECONDARY_HOMEWORK_ONE.dialogue.lines),
    [dialogue],
  );
  const questionScore = useMemo(
    () => scoreSecondaryAnswers(questionChoices, SECONDARY_HOMEWORK_ONE.questions.items),
    [questionChoices],
  );

  const isAvailable = (index: number) => index === 0 || savedParts.has(TEMPLATE.parts[index - 1]!.id);

  function moveSequence(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sequence.length) return;
    setSequence((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
    setCheckedScores((current) => {
      const next = { ...current };
      delete next["community-sequence"];
      return next;
    });
  }

  function setAnswer(
    setter: React.Dispatch<React.SetStateAction<Record<string, string>>>,
    partId: string,
    id: string,
    value: string,
  ) {
    setter((current) => ({ ...current, [id]: value }));
    setCheckedScores((current) => {
      const next = { ...current };
      delete next[partId];
      return next;
    });
  }

  function saveObjectivePart(partId: string, answers: Record<string, string>, correct: number, total: number) {
    setNotice("");
    startTransition(async () => {
      if (homeworkId) {
        const result = await saveHomeworkTemplatePart({ homeworkId, partId, snapshot: { answers, correct, total } });
        if (!result.ok) {
          setNotice(result.error);
          return;
        }
      }
      setSavedParts((current) => new Set(current).add(partId));
      const nextPart = TEMPLATE.parts.find((part) => part.order === activePart.order + 1);
      if (nextPart) setActivePartId(nextPart.id);
      setNotice("Part saved.");
    });
  }

  function finishHomework() {
    if (!recording) {
      setNotice("Save a spoken answer before submitting your homework.");
      return;
    }
    setNotice("");
    startTransition(async () => {
      if (!homeworkId) {
        setSavedParts((current) => new Set(current).add("community-speaking"));
        setNotice("Pilot complete. Your speaking answer is ready for teacher review.");
        return;
      }
      const submission = await saveHomeworkTemplatePart({
        homeworkId,
        partId: "community-speaking",
        snapshot: {
          answers: { [SECONDARY_HOMEWORK_ONE.speaking.responseId]: recording.id },
          correct: null,
          total: SECONDARY_HOMEWORK_ONE.speaking.teacherScoreTotal,
        },
        submit: true,
      });
      if (!submission.ok) {
        setNotice(submission.error);
        return;
      }
      const completion = await recordHomeworkTemplateCompletion({ homeworkId });
      if (!completion.ok) {
        setNotice(completion.error);
        return;
      }
      setSavedParts((current) => new Set(current).add("community-speaking"));
      setNotice("Homework submitted.");
      router.push(homeHref);
    });
  }

  function resetPilot() {
    if (homeworkId) return;
    setActivePartId(PART_IDS[0]!);
    setSavedParts(new Set());
    setSequence(SECONDARY_HOMEWORK_ONE.reading.events.map((event) => event.id));
    setCorrections({});
    setDialogue({});
    setQuestionChoices({});
    setRecording(undefined);
    setCheckedScores({});
    setNotice("");
  }

  function objectiveFooter(input: {
    partId: string;
    answers: Record<string, string>;
    score: number;
    total: number;
    complete: boolean;
  }) {
    const checked = checkedScores[input.partId];
    return <div className="mt-6 border-t-2 border-slate-100 pt-4">
      {checked !== undefined ? (
        <div className={`mb-3 rounded-xl border-2 p-3 text-sm font-black ${resultTone(checked, input.total)}`}>
          {checked}/{input.total} correct. Review any answers you want to change, or save this part and continue.
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!input.complete || pending}
          onClick={() => setCheckedScores((current) => ({ ...current, [input.partId]: input.score }))}
          className="min-h-11 rounded-xl bg-[#17375e] px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Check answers
        </button>
        {checked !== undefined ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => saveObjectivePart(input.partId, input.answers, input.score, input.total)}
            className="min-h-11 rounded-xl border-2 border-[#17375e] bg-[#ffd34f] px-5 text-sm font-black text-[#17375e] disabled:opacity-50"
          >
            {pending ? "Saving..." : "Save and continue"}
          </button>
        ) : null}
      </div>
      {!input.complete ? <p className="mt-2 text-xs font-bold text-slate-500">Answer every question before checking this part.</p> : null}
    </div>;
  }

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">Secondary - Grades 8–9</p>
            <h2 className="mt-1 text-2xl font-black text-[#17375e]">{TEMPLATE.title}</h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-600">{TEMPLATE.subtitle}</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-2 text-xs font-black text-violet-900">
            <Clock3 className="h-4 w-4" /> About {TEMPLATE.estimatedMinutes} minutes
          </span>
        </div>
        {!homeworkId ? <button type="button" onClick={resetPilot} className="mt-3 inline-flex items-center gap-1 text-xs font-black text-slate-600 underline"><RotateCcw className="h-3.5 w-3.5" />Reset pilot</button> : null}
      </header>

      {notice ? <p role="status" className="rounded-xl border-2 border-sky-200 bg-sky-50 px-4 py-3 text-sm font-black text-sky-900">{notice}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <nav aria-label="Homework parts" className="space-y-2 lg:sticky lg:top-4 lg:self-start">
          <p className="px-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">Five-part homework</p>
          {TEMPLATE.parts.map((part, index) => {
            const active = part.id === activePart.id;
            const done = savedParts.has(part.id);
            const available = isAvailable(index);
            return (
              <button
                key={part.id}
                type="button"
                disabled={!available}
                onClick={() => available && setActivePartId(part.id)}
                className={`flex w-full items-center gap-3 rounded-xl border-2 px-3 py-3 text-left transition ${active ? "border-violet-600 bg-violet-50 text-violet-950" : available ? "border-slate-300 bg-white text-slate-800 hover:border-violet-400" : "border-slate-200 bg-white/60 text-slate-400"}`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${done ? "bg-emerald-500 text-white" : active ? "bg-violet-700 text-white" : "bg-slate-200"}`}>
                  {done ? <Check className="h-4 w-4" /> : part.order}
                </span>
                <span className="min-w-0 flex-1 text-sm font-black">{part.label}</span>
                {!available ? <LockKeyhole className="h-4 w-4 shrink-0" /> : null}
              </button>
            );
          })}
        </nav>

        <section className="min-w-0 rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-700">Part {activePart.order} of {TEMPLATE.sectionCount}</p>
            <h3 className="mt-1 text-xl font-black text-[#17375e]">{activePart.label}</h3>
          </div>

          {activePartId === "community-sequence" ? <div>
            <p className="font-bold text-slate-700">{SECONDARY_HOMEWORK_ONE.reading.instructions}</p>
            <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
              <article className="rounded-xl border-2 border-sky-100 bg-sky-50/50 p-4">
                <h4 className="text-lg font-black text-[#17375e]">{SECONDARY_HOMEWORK_ONE.reading.title}</h4>
                <div className="mt-3 space-y-3 text-sm font-medium leading-7 text-slate-700">
                  {SECONDARY_HOMEWORK_ONE.reading.paragraphs.map((paragraph) => <p key={paragraph.slice(0, 35)}>{paragraph}</p>)}
                </div>
              </article>
              <div>
                <p className="mb-2 text-sm font-black text-slate-700">Put the events in the correct order.</p>
                <ol className="space-y-2">
                  {sequence.map((eventId, index) => {
                    const event = SECONDARY_HOMEWORK_ONE.reading.events.find((item) => item.id === eventId)!;
                    return <li key={event.id} className="flex gap-2 rounded-xl border-2 border-slate-200 bg-white p-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-700 text-sm font-black text-white">{index + 1}</span>
                      <p className="min-w-0 flex-1 text-sm font-semibold leading-6 text-slate-700"><span className="font-black">{event.id}.</span> {event.text}</p>
                      <div className="flex shrink-0 flex-col gap-1">
                        <button type="button" aria-label={`Move event ${event.id} up`} disabled={index === 0} onClick={() => moveSequence(index, -1)} className="rounded-md border border-slate-300 p-1.5 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                        <button type="button" aria-label={`Move event ${event.id} down`} disabled={index === sequence.length - 1} onClick={() => moveSequence(index, 1)} className="rounded-md border border-slate-300 p-1.5 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                      </div>
                    </li>;
                  })}
                </ol>
              </div>
            </div>
            {objectiveFooter({ partId: activePartId, answers: sequenceAnswers(sequence), score: scoreSequence(sequence), total: sequence.length, complete: true })}
          </div> : null}

          {activePartId === "past-corrections" ? <div>
            <p className="font-bold text-slate-700">{SECONDARY_HOMEWORK_ONE.corrections.instructions}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {SECONDARY_HOMEWORK_ONE.corrections.questions.map((question, index) => <label key={question.id} className="rounded-xl border-2 border-slate-200 p-4">
                <span className="text-xs font-black uppercase tracking-wide text-violet-700">Question {index + 1}</span>
                <span className="mt-2 block text-sm font-semibold leading-6 text-slate-700">{question.sentence}</span>
                <span className="mt-3 block text-xs font-black text-slate-600">Correct verb</span>
                <input value={corrections[question.id] ?? ""} onChange={(event) => setAnswer(setCorrections, activePartId, question.id, event.target.value)} autoCapitalize="none" className="mt-1 min-h-11 w-full rounded-lg border-2 border-slate-300 px-3 font-bold outline-none focus:border-violet-500" />
              </label>)}
            </div>
            {objectiveFooter({ partId: activePartId, answers: corrections, score: correctionScore, total: SECONDARY_HOMEWORK_ONE.corrections.questions.length, complete: SECONDARY_HOMEWORK_ONE.corrections.questions.every((item) => Boolean(corrections[item.id]?.trim())) })}
          </div> : null}

          {activePartId === "irregular-dialogue" ? <div>
            <p className="font-bold text-slate-700">{SECONDARY_HOMEWORK_ONE.dialogue.instructions}</p>
            <div className="mt-4 space-y-3">
              {SECONDARY_HOMEWORK_ONE.dialogue.lines.map((line) => <label key={line.id} className="block rounded-xl border-2 border-slate-200 p-3 sm:p-4">
                <span className="mb-2 block text-xs font-black uppercase tracking-wide text-violet-700">{line.speaker}</span>
                <span className="flex flex-wrap items-center gap-2 text-sm font-semibold leading-7 text-slate-700">
                  <span>{line.before}</span>
                  <input aria-label={`Blank ${line.id.split("-")[1]} (${line.clue})`} value={dialogue[line.id] ?? ""} onChange={(event) => setAnswer(setDialogue, activePartId, line.id, event.target.value)} autoCapitalize="none" className="min-h-10 min-w-40 flex-1 rounded-lg border-2 border-slate-300 px-3 font-bold outline-none focus:border-violet-500 sm:max-w-xs" />
                  <span>{line.after}</span>
                  <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-black text-amber-900">({line.clue})</span>
                </span>
              </label>)}
            </div>
            {objectiveFooter({ partId: activePartId, answers: dialogue, score: dialogueScore, total: SECONDARY_HOMEWORK_ONE.dialogue.lines.length, complete: SECONDARY_HOMEWORK_ONE.dialogue.lines.every((item) => Boolean(dialogue[item.id]?.trim())) })}
          </div> : null}

          {activePartId === "past-question-choice" ? <div>
            <p className="font-bold text-slate-700">{SECONDARY_HOMEWORK_ONE.questions.instructions}</p>
            <div className="mt-4 space-y-3">
              {SECONDARY_HOMEWORK_ONE.questions.items.map((item, index) => <fieldset key={item.id} className="rounded-xl border-2 border-slate-200 p-4">
                <legend className="px-1 text-xs font-black uppercase tracking-wide text-violet-700">Question {index + 1}</legend>
                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-700">
                  {item.before ? <span>{item.before}</span> : null}
                  <span className="inline-flex gap-2">
                    {item.choices.map((choice) => <button key={choice} type="button" aria-pressed={questionChoices[item.id] === choice} onClick={() => setAnswer(setQuestionChoices, activePartId, item.id, choice)} className={`min-h-10 rounded-lg border-2 px-3 font-black ${questionChoices[item.id] === choice ? "border-violet-700 bg-violet-700 text-white" : "border-slate-300 bg-white hover:border-violet-400"}`}>{choice}</button>)}
                  </span>
                  <span>{item.after}</span>
                </div>
              </fieldset>)}
            </div>
            {objectiveFooter({ partId: activePartId, answers: questionChoices, score: questionScore, total: SECONDARY_HOMEWORK_ONE.questions.items.length, complete: SECONDARY_HOMEWORK_ONE.questions.items.every((item) => Boolean(questionChoices[item.id])) })}
          </div> : null}

          {activePartId === "community-speaking" ? <div>
            <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
              <p className="font-black leading-7 text-slate-800">{SECONDARY_HOMEWORK_ONE.speaking.instructions}</p>
              <ul className="mt-3 space-y-2 text-sm font-semibold text-slate-700">
                {SECONDARY_HOMEWORK_ONE.speaking.planningPrompts.map((prompt) => <li key={prompt} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />{prompt}</li>)}
              </ul>
            </div>
            <div className="mt-4">
              <AssessmentSpeakingRecorder
                homeworkId={homeworkId}
                partId="community-speaking"
                responseId={SECONDARY_HOMEWORK_ONE.speaking.responseId}
                maxDurationSeconds={SECONDARY_HOMEWORK_ONE.speaking.maxDurationSeconds}
                initialRecording={recording}
                submissionKind="homework-template"
                onSaved={setRecording}
              />
            </div>
            <p className="mt-3 text-xs font-bold text-slate-500">Your teacher will listen to this response and award up to {SECONDARY_HOMEWORK_ONE.speaking.teacherScoreTotal} points.</p>
            <button type="button" disabled={!recording || pending} onClick={finishHomework} className="mt-5 min-h-12 rounded-xl bg-emerald-600 px-6 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">
              {pending ? "Submitting..." : homeworkId ? "Submit homework" : "Finish pilot"}
            </button>
          </div> : null}

          {activeIndex > 0 ? <button type="button" onClick={() => setActivePartId(TEMPLATE.parts[activeIndex - 1]!.id)} className="mt-6 text-sm font-black text-violet-800 underline underline-offset-4">Back to Part {activePart.order - 1}</button> : null}
        </section>
      </div>
    </div>
  );
}
