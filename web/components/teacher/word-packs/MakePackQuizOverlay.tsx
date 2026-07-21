"use client";

import { useEffect, useId, useRef, useState } from "react";
import { loadPackQuizLexemes } from "@/lib/actions/pack-quiz";
import {
  PACK_QUIZ_FORMATS,
  compilePackMultipleChoiceQuiz,
  createPackQuizDraft,
  isPackQuizFormatAvailable,
  packQuizComingSoonMessage,
  packQuizFormatReadiness,
  type PackQuizCompileResult,
  type PackQuizDraft,
  type PackQuizFormat,
} from "@/lib/vocabulary/pack-quiz";
import { PackMcQuizPreview } from "@/components/teacher/word-packs/PackMcQuizPreview";

type Props = {
  open: boolean;
  onClose: () => void;
  packId: string;
  packTitle: string;
  wordIds: readonly string[];
};

type Step = "pick" | "preview";

export function MakePackQuizOverlay({ open, onClose, packId, packTitle, wordIds }: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [format, setFormat] = useState<PackQuizFormat>("multiple_choice");
  const [draft, setDraft] = useState<PackQuizDraft | null>(null);
  const [gateMessage, setGateMessage] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("pick");
  const [compiled, setCompiled] = useState<PackQuizCompileResult | null>(null);
  const [building, setBuilding] = useState(false);

  const wordCount = wordIds.length;
  const readiness = packQuizFormatReadiness(format, wordCount);

  useEffect(() => {
    if (!open) return;
    setFormat("multiple_choice");
    setDraft(null);
    setGateMessage(null);
    setStep("pick");
    setCompiled(null);
    setBuilding(false);
    const t = window.setTimeout(() => closeRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open, packId]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  function resetToFormats() {
    setStep("pick");
    setCompiled(null);
    setGateMessage(null);
    setDraft(null);
  }

  async function onContinue() {
    setGateMessage(null);
    if (!readiness.ok) {
      setGateMessage(readiness.reason ?? "Pack isn’t ready for this format.");
      setDraft(null);
      setCompiled(null);
      return;
    }

    const next = createPackQuizDraft({
      packId,
      packTitle,
      format,
      wordIds,
    });
    setDraft(next);

    if (!isPackQuizFormatAvailable(format)) {
      setCompiled(null);
      setStep("pick");
      setGateMessage(packQuizComingSoonMessage(format));
      return;
    }

    setBuilding(true);
    try {
      const loaded = await loadPackQuizLexemes({
        packId,
        wordIds: next.wordIds,
      });
      if (!loaded.ok) {
        setGateMessage(loaded.error);
        setCompiled(null);
        return;
      }

      const result = compilePackMultipleChoiceQuiz({
        draft: next,
        lexemes: loaded.lexemes,
        seed: next.createdAt,
      });

      if (result.questions.length === 0) {
        setGateMessage(
          result.warnings.join(" ") || "Could not build a quiz from this pack.",
        );
        setCompiled(null);
        return;
      }

      setCompiled(result);
      setGateMessage(null);
      setStep("preview");
    } finally {
      setBuilding(false);
    }
  }

  if (!open) return null;

  const wide = step === "preview";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className={`flex max-h-[min(92dvh,48rem)] w-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl ${
          wide ? "max-w-2xl" : "max-w-lg"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-neutral-200 px-4 py-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-bold text-neutral-900">
              Make a quiz
            </h2>
            <p className="mt-0.5 truncate text-sm text-neutral-600" title={packTitle}>
              {packTitle}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              {wordCount} word{wordCount === 1 ? "" : "s"} · teacher preview · word list freezes when
              you continue
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="shrink-0 rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
          >
            Close
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-auto px-4 py-4">
          {step === "preview" && compiled ? (
            <PackMcQuizPreview compiled={compiled} onBackToFormats={resetToFormats} />
          ) : (
            <>
              <fieldset className="space-y-2" disabled={building}>
                <legend className="text-sm font-semibold text-neutral-900">Choose a format</legend>
                {PACK_QUIZ_FORMATS.map((option) => {
                  const selected = format === option.id;
                  const optionReady = packQuizFormatReadiness(option.id, wordCount);
                  const available = isPackQuizFormatAvailable(option.id);
                  return (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer gap-3 rounded-lg border px-3 py-2.5 ${
                        selected
                          ? "border-neutral-900 bg-neutral-50"
                          : "border-neutral-200 hover:border-neutral-400"
                      }`}
                    >
                      <input
                        type="radio"
                        name="pack-quiz-format"
                        className="mt-1"
                        checked={selected}
                        onChange={() => {
                          setFormat(option.id);
                          setDraft(null);
                          setGateMessage(null);
                          setCompiled(null);
                        }}
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-neutral-900">
                          {option.label}
                        </span>
                        <span className="mt-0.5 block text-xs text-neutral-600">
                          {option.description}
                        </span>
                        <span className="mt-1 block text-[11px] font-medium text-neutral-500">
                          Min {option.minWords} word{option.minWords === 1 ? "" : "s"}
                          {!optionReady.ok ? " · not enough words yet" : ""}
                          {available
                            ? " · ready now"
                            : ` · Slice ${option.implementedInSlice} next`}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </fieldset>

              {gateMessage ? (
                <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                  <p>{gateMessage}</p>
                  {draft ? (
                    <p className="mt-2 text-xs text-amber-900/80">
                      Draft frozen: {draft.wordIds.length} id
                      {draft.wordIds.length === 1 ? "" : "s"} · {draft.format} ·{" "}
                      {new Date(draft.createdAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>

        {step === "pick" ? (
          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-neutral-100 px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void onContinue()}
              disabled={building}
              className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
            >
              {building ? "Building…" : "Continue"}
            </button>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
