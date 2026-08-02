"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Check, Circle, Eraser, Underline } from "lucide-react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import {
  isWordAnnotationMastered,
  scoreWordAnnotationPlayable,
  type WordAnnotationPlayable,
  type WordAnnotationRole,
} from "@/lib/word-annotation";

type MarkingTool = WordAnnotationRole | "erase";
type Stage = "activity" | "review";

type Props = {
  activity: WordAnnotationPlayable;
  eyebrow?: string;
  onMastered?: (snapshot: { answers: Record<string, string>; correct: number; total: number }) => void;
};

export function WordAnnotationPlayer({
  activity,
  eyebrow = "Word annotation",
  onMastered,
}: Props) {
  const [annotations, setAnnotations] = useState<Record<string, WordAnnotationRole>>(
    {},
  );
  const [tool, setTool] = useState<MarkingTool>("adjective");
  const [checked, setChecked] = useState(false);
  const [stage, setStage] = useState<Stage>("activity");

  const result = useMemo(
    () => scoreWordAnnotationPlayable(activity, annotations),
    [activity, annotations],
  );
  const mastered = checked && isWordAnnotationMastered(result);

  const mark = (tokenId: string) => {
    setChecked(false);
    setAnnotations((current) => {
      const next = { ...current };
      if (tool === "erase" || next[tokenId] === tool) delete next[tokenId];
      else next[tokenId] = tool;
      return next;
    });
  };

  if (stage === "review") {
    return (
      <KidPanel className="bg-white text-center">
        <div
          className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full ${
            mastered ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
          }`}
        >
          <Check className="h-14 w-14" />
        </div>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-violet-700">
          Review
        </p>
        <h2 className="mt-2 text-3xl font-black text-kid-ink">
          {mastered ? "Grammar detective complete!" : "Some words need another look."}
        </h2>
        <p className="mt-3 text-lg font-bold text-kid-ink/70">
          You identified {result.correct} of {result.expected} target words correctly
          {result.incorrect
            ? ` and made ${result.incorrect} extra or incorrect marking${
                result.incorrect === 1 ? "" : "s"
              }`
            : ""}
          .
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <KidButton
            variant="secondary"
            onClick={() => {
              setStage("activity");
              setChecked(false);
            }}
          >
            {mastered ? "Practise again" : "Fix my markings"}
          </KidButton>
          {mastered && onMastered ? <KidButton onClick={() => onMastered({ answers: annotations, correct: result.correct, total: result.expected })}>Done</KidButton> : null}
        </div>
      </KidPanel>
    );
  }

  return (
    <div className="space-y-4">
      <KidPanel className="bg-slate-100">
        <p className="text-xs font-black uppercase tracking-wide text-slate-700">
          Remember!
        </p>
        <p className="mt-1 font-black text-kid-ink">{activity.rememberText}</p>
      </KidPanel>

      <KidPanel className="bg-white">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-2xl font-black text-kid-ink">{activity.title}</h2>
        <p className="mt-1 font-semibold text-kid-ink/70">{activity.instructions}</p>
        <div
          className="mt-5 grid gap-2 sm:grid-cols-3"
          role="toolbar"
          aria-label="Word marking tools"
        >
          <ToolButton
            active={tool === "adjective"}
            tone="rose"
            onClick={() => setTool("adjective")}
            icon={<Circle className="h-5 w-5" />}
            label="Circle adjective"
          />
          <ToolButton
            active={tool === "adverb"}
            tone="sky"
            onClick={() => setTool("adverb")}
            icon={<Underline className="h-5 w-5" />}
            label="Underline adverb"
          />
          <ToolButton
            active={tool === "erase"}
            tone="stone"
            onClick={() => setTool("erase")}
            icon={<Eraser className="h-5 w-5" />}
            label="Erase mark"
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold text-slate-600">
          <span>
            <span className="mr-1 inline-block rounded-full border-2 border-rose-500 px-2">
              word
            </span>{" "}
            adjective
          </span>
          <span>
            <span className="mr-1 inline-block border-b-4 border-sky-500 px-1">word</span>{" "}
            adverb
          </span>
        </div>
      </KidPanel>

      <div className="space-y-3">
        {activity.sentences.map((sentence, sentenceIndex) => (
          <article
            key={sentence.id}
            className="rounded-2xl border-4 border-[#17375e] bg-white p-5 shadow-[4px_4px_0_0_#cbd5e1]"
          >
            <p className="mb-3 text-xs font-black uppercase tracking-wide text-violet-700">
              Sentence {sentenceIndex + 1}
            </p>
            <div className="flex flex-wrap items-end gap-x-2 gap-y-3 text-xl font-bold leading-10 text-slate-800">
              {sentence.tokens.map((token) => {
                const marked = annotations[token.id];
                const correct = checked && token.role === marked;
                const wrong =
                  checked &&
                  ((token.role && token.role !== marked) || (!token.role && marked));
                return (
                  <button
                    key={token.id}
                    type="button"
                    onClick={() => mark(token.id)}
                    aria-label={`${token.text}, ${
                      marked ? `marked as ${marked}` : "not marked"
                    }`}
                    className={`relative rounded-md px-1.5 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-4 focus-visible:outline-amber-400 ${
                      marked === "adjective"
                        ? "rounded-[50%] border-2 border-rose-500"
                        : "border-2 border-transparent"
                    } ${marked === "adverb" ? "border-b-4 !border-b-sky-500" : ""} ${
                      correct ? "bg-emerald-50" : wrong ? "bg-amber-100" : ""
                    }`}
                  >
                    {token.text}
                    {checked && token.role && token.role !== marked ? (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase text-amber-800">
                        {token.role === "adjective" ? "circle" : "underline"}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </article>
        ))}
      </div>

      {checked ? (
        <KidPanel
          className={`bg-white ${mastered ? "border-emerald-600" : "border-amber-500"}`}
        >
          <p className="font-black text-kid-ink">
            {mastered
              ? "Every adjective and adverb is marked correctly!"
              : `${result.correct} of ${result.expected} target words correct. Check the highlighted clues.`}
          </p>
          {result.incorrect ? (
            <p className="mt-1 text-sm font-bold text-amber-900">
              Remove or change {result.incorrect} extra or incorrect marking
              {result.incorrect === 1 ? "" : "s"}.
            </p>
          ) : null}
        </KidPanel>
      ) : null}

      <KidPanel className="flex flex-wrap items-center justify-between gap-3 bg-white">
        <p className="text-sm font-semibold text-kid-ink/70">
          {Object.keys(annotations).length} marking
          {Object.keys(annotations).length === 1 ? "" : "s"} · {result.expected} targets
        </p>
        {mastered ? (
          <KidButton onClick={() => setStage("review")}>Review</KidButton>
        ) : (
          <KidButton
            disabled={Object.keys(annotations).length === 0}
            onClick={() => setChecked(true)}
          >
            {checked ? "Check again" : "Check my markings"}
          </KidButton>
        )}
      </KidPanel>
    </div>
  );
}

function ToolButton({
  active,
  tone,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  tone: "rose" | "sky" | "stone";
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  const toneClass =
    tone === "rose"
      ? "border-rose-500 bg-rose-50 text-rose-900"
      : tone === "sky"
        ? "border-sky-500 bg-sky-50 text-sky-900"
        : "border-stone-400 bg-stone-50 text-stone-800";
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-black ${
        active
          ? `${toneClass} ring-4 ring-amber-200`
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
