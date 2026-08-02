"use client";

import { useMemo, useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import {
  scoreSentenceColumnsPlayable,
  type SentenceColumnId,
  type SentenceColumnsPlayable,
} from "@/lib/sentence-columns";

type Stage = "activity" | "review";

type Props = {
  activity: SentenceColumnsPlayable;
  eyebrow?: string;
  onMastered?: (snapshot: { answers: Record<string, string>; correct: number; total: number }) => void;
};

export function SentenceColumnsPlayer({
  activity,
  eyebrow = "Sentence columns",
  onMastered,
}: Props) {
  const [placements, setPlacements] = useState<Record<string, SentenceColumnId>>({});
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [stage, setStage] = useState<Stage>("activity");

  const result = useMemo(
    () => scoreSentenceColumnsPlayable(activity, placements),
    [activity, placements],
  );
  const totalPlaced = Object.keys(placements).length;
  const mastered = checked && result.correct === result.total;

  const place = (columnId: SentenceColumnId) => {
    if (!selectedPieceId) return;
    const challenge = activity.challenges.find((item) =>
      item.pieces.some((piece) => piece.id === selectedPieceId),
    );
    setPlacements((current) => {
      const next = { ...current };
      challenge?.pieces.forEach((piece) => {
        if (next[piece.id] === columnId) delete next[piece.id];
      });
      next[selectedPieceId] = columnId;
      return next;
    });
    setSelectedPieceId(null);
    setChecked(false);
  };

  if (stage === "review") {
    return (
      <KidPanel className="bg-white text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Check className="h-14 w-14" />
        </div>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-fuchsia-700">
          Review
        </p>
        <h2 className="mt-2 text-3xl font-black text-kid-ink">Sentence builder complete!</h2>
        <p className="mt-3 text-lg font-bold text-kid-ink/70">
          You placed all {result.total} sentence parts in the correct structural columns.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <KidButton
            variant="secondary"
            onClick={() => {
              setStage("activity");
              setChecked(false);
            }}
          >
            Practise again
          </KidButton>
          {onMastered ? <KidButton onClick={() => onMastered({ answers: placements, correct: result.correct, total: result.total })}>Done</KidButton> : null}
        </div>
      </KidPanel>
    );
  }

  return (
    <div className="space-y-4">
      <KidPanel className="bg-white">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-fuchsia-700">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-2xl font-black text-kid-ink">{activity.title}</h2>
        <p className="mt-1 font-semibold text-kid-ink/70">{activity.instructions}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {activity.columns.map((column) => (
            <div key={column.id} className="rounded-xl bg-fuchsia-50 p-3">
              <p className="font-black text-fuchsia-950">{column.label}</p>
              <p className="text-xs font-semibold text-fuchsia-800">{column.prompt}</p>
            </div>
          ))}
        </div>
      </KidPanel>

      {activity.challenges.map((challenge, challengeIndex) => {
        const sentencePieces = activity.columns.map((column) =>
          challenge.pieces.find((piece) => placements[piece.id] === column.id),
        );
        const challengeCorrect =
          checked &&
          challenge.pieces.every((piece) => placements[piece.id] === piece.columnId);
        return (
          <article
            key={challenge.id}
            className={`rounded-2xl border-4 bg-white p-4 shadow-[4px_4px_0_0_#d8b4fe] ${
              checked
                ? challengeCorrect
                  ? "border-emerald-500"
                  : "border-amber-400"
                : "border-[#432c7a]"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-wide text-fuchsia-700">
                Sentence {challengeIndex + 1}
              </p>
              <button
                type="button"
                onClick={() => {
                  setPlacements((current) => {
                    const next = { ...current };
                    challenge.pieces.forEach((piece) => delete next[piece.id]);
                    return next;
                  });
                  setChecked(false);
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Clear
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {challenge.pieces.map((piece) => (
                <button
                  key={piece.id}
                  type="button"
                  aria-pressed={selectedPieceId === piece.id}
                  onClick={() =>
                    setSelectedPieceId(selectedPieceId === piece.id ? null : piece.id)
                  }
                  className={`rounded-xl border-2 px-4 py-2 text-sm font-black transition ${
                    selectedPieceId === piece.id
                      ? "border-amber-500 bg-amber-100 ring-4 ring-amber-200"
                      : placements[piece.id]
                        ? "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900"
                        : "border-slate-300 bg-white text-slate-800 hover:border-fuchsia-500"
                  }`}
                >
                  {piece.text}
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {activity.columns.map((column) => {
                const placed = challenge.pieces.find(
                  (piece) => placements[piece.id] === column.id,
                );
                const placementCorrect = checked && placed?.columnId === column.id;
                const placementWrong =
                  checked && placed && placed.columnId !== column.id;
                return (
                  <button
                    key={column.id}
                    type="button"
                    disabled={!selectedPieceId}
                    onClick={() => place(column.id)}
                    className={`min-h-24 rounded-xl border-2 border-dashed p-3 text-left disabled:cursor-default ${
                      placementCorrect
                        ? "border-emerald-500 bg-emerald-50"
                        : placementWrong
                          ? "border-amber-500 bg-amber-50"
                          : selectedPieceId
                            ? "border-fuchsia-500 bg-fuchsia-50 hover:bg-fuchsia-100"
                            : "border-slate-300 bg-slate-50"
                    }`}
                  >
                    <span className="block text-[10px] font-black uppercase tracking-wide text-slate-500">
                      {column.label}
                    </span>
                    <span className="mt-2 block text-sm font-black text-[#17375e]">
                      {placed?.text ??
                        (selectedPieceId ? "Place selected piece" : "Choose a piece")}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                Your sentence
              </p>
              <p className="mt-1 text-lg font-black text-[#17375e]">
                {sentencePieces.map((piece) => piece?.text ?? "____").join(" ")}
                {sentencePieces.every(Boolean) ? "." : ""}
              </p>
            </div>
            {checked && !challengeCorrect ? (
              <p className="mt-3 text-sm font-bold text-amber-900">
                Some parts are in the wrong columns. Select a piece and move it.
              </p>
            ) : null}
          </article>
        );
      })}

      <KidPanel className="flex flex-wrap items-center justify-between gap-3 bg-white">
        <div>
          <p className="font-black text-kid-ink">
            {totalPlaced} of {result.total} pieces placed
          </p>
          <p className="text-sm font-semibold text-kid-ink/65">
            Each column holds one part of each sentence.
          </p>
        </div>
        {mastered ? (
          <KidButton onClick={() => setStage("review")}>Review</KidButton>
        ) : (
          <KidButton
            disabled={totalPlaced < result.total}
            onClick={() => setChecked(true)}
          >
            {checked ? "Check again" : "Check my sentences"}
          </KidButton>
        )}
      </KidPanel>
    </div>
  );
}
