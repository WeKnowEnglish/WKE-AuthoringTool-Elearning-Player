"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { loadPackQuizLexemes } from "@/lib/actions/pack-quiz";
import {
  PACK_QUIZ_FORMATS,
  compilePackLetterScrambleQuiz,
  compilePackMultipleChoiceQuiz,
  compilePackSentenceScrambleQuiz,
  compilePackTrueFalseQuiz,
  createPackQuizDraft,
  freezeSelectedPackWordIds,
  isPackQuizFormatAvailable,
  packQuizComingSoonMessage,
  packQuizFormatReadiness,
  type PackQuizCompileResult,
  type PackQuizDraft,
  type PackQuizFormat,
} from "@/lib/vocabulary/pack-quiz";
import type { PackLexemeResolution } from "@/lib/vocabulary/teacher-lexicon/resolve-pack";
import { PackMcQuizPreview } from "@/components/teacher/word-packs/PackMcQuizPreview";
import { PackQuizEditorOverlay } from "@/components/teacher/word-packs/PackQuizEditorOverlay";

type Props = {
  open: boolean;
  onClose: () => void;
  packId: string;
  packTitle: string;
  wordIds: readonly string[];
};

type Step = "pick" | "select" | "preview";

function meaningHint(row: PackLexemeResolution): string {
  const en = row.definitionEn?.trim();
  if (en) return en;
  const vi = row.definitionVi?.trim();
  if (vi) return vi;
  if (row.source === "missing") return "Missing from lexicon";
  if (row.archived) return "Archived";
  return "No meaning yet";
}

export function MakePackQuizOverlay({ open, onClose, packId, packTitle, wordIds }: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [format, setFormat] = useState<PackQuizFormat>("multiple_choice");
  const [draft, setDraft] = useState<PackQuizDraft | null>(null);
  const [gateMessage, setGateMessage] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("pick");
  const [compiled, setCompiled] = useState<PackQuizCompileResult | null>(null);
  const [building, setBuilding] = useState(false);
  const [loadingWords, setLoadingWords] = useState(false);
  const [lexemes, setLexemes] = useState<PackLexemeResolution[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [editorQuiz, setEditorQuiz] = useState<{ id: string; title: string } | null>(null);

  const packWordCount = wordIds.length;
  const selectedCount = selectedIds.size;
  const packReadiness = packQuizFormatReadiness(format, packWordCount);
  const selectReadiness = packQuizFormatReadiness(format, selectedCount);
  const formatMeta = PACK_QUIZ_FORMATS.find((f) => f.id === format);

  const rows = useMemo(() => {
    const byId = new Map(lexemes.map((row) => [row.id, row]));
    return wordIds.map((id) => {
      const row = byId.get(id);
      if (row) return row;
      return {
        id,
        lemma: id,
        pos: "",
        primaryStageCandidate: "",
        primaryTopic: "",
        source: "missing" as const,
        archived: false,
        readyForClass: false,
      };
    });
  }, [lexemes, wordIds]);

  useEffect(() => {
    if (!open) return;
    setFormat("multiple_choice");
    setDraft(null);
    setGateMessage(null);
    setStep("pick");
    setCompiled(null);
    setBuilding(false);
    setLoadingWords(false);
    setLexemes([]);
    setSelectedIds(new Set(wordIds));
    const t = window.setTimeout(() => closeRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
    // Reset when the overlay opens for a pack — not on every wordIds array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- wordIds read on open/packId
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

  function backToSelect() {
    setStep("select");
    setCompiled(null);
    setGateMessage(null);
    setDraft(null);
  }

  function toggleWord(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setGateMessage(null);
    setDraft(null);
    setCompiled(null);
  }

  function selectAll() {
    setSelectedIds(new Set(wordIds));
    setGateMessage(null);
    setDraft(null);
    setCompiled(null);
  }

  function selectNone() {
    setSelectedIds(new Set());
    setGateMessage(null);
    setDraft(null);
    setCompiled(null);
  }

  async function onContinueToSelect() {
    setGateMessage(null);
    setDraft(null);
    setCompiled(null);

    if (!packReadiness.ok) {
      setGateMessage(packReadiness.reason ?? "Pack isn’t ready for this format.");
      return;
    }

    setLoadingWords(true);
    try {
      const loaded = await loadPackQuizLexemes({
        packId,
        wordIds,
      });
      if (!loaded.ok) {
        setGateMessage(loaded.error);
        return;
      }
      setLexemes(loaded.lexemes);
      setSelectedIds(new Set(wordIds));
      setStep("select");
    } finally {
      setLoadingWords(false);
    }
  }

  async function onGenerate() {
    setGateMessage(null);

    const frozenIds = freezeSelectedPackWordIds(wordIds, selectedIds);
    if (!selectReadiness.ok) {
      setGateMessage(selectReadiness.reason ?? "Select more words for this format.");
      setDraft(null);
      setCompiled(null);
      return;
    }

    const next = createPackQuizDraft({
      packId,
      packTitle,
      format,
      wordIds: frozenIds,
    });
    setDraft(next);

    if (!isPackQuizFormatAvailable(format)) {
      setCompiled(null);
      setGateMessage(packQuizComingSoonMessage(format));
      return;
    }

    setBuilding(true);
    try {
      // Prefer already-loaded lexemes; reload if selection somehow outpaces cache.
      let pool = lexemes;
      if (pool.length === 0) {
        const loaded = await loadPackQuizLexemes({
          packId,
          wordIds: frozenIds,
        });
        if (!loaded.ok) {
          setGateMessage(loaded.error);
          setCompiled(null);
          return;
        }
        pool = loaded.lexemes;
        setLexemes(pool);
      }

      const result =
        format === "true_false"
          ? compilePackTrueFalseQuiz({
              draft: next,
              lexemes: pool,
              seed: next.createdAt,
            })
          : format === "letter_scramble"
            ? compilePackLetterScrambleQuiz({
                draft: next,
                lexemes: pool,
                seed: next.createdAt,
              })
            : format === "sentence_scramble"
              ? compilePackSentenceScrambleQuiz({
                  draft: next,
                  lexemes: pool,
                  seed: next.createdAt,
                })
              : compilePackMultipleChoiceQuiz({
                  draft: next,
                  lexemes: pool,
                  seed: next.createdAt,
                });

      if (result.questions.length === 0) {
        setGateMessage(
          result.warnings.join(" ") || "Could not build a quiz from the selected words.",
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

  if (!open && !editorQuiz) return null;

  const wide = step === "preview" || step === "select";
  const stepHint =
    step === "pick"
      ? `${packWordCount} word${packWordCount === 1 ? "" : "s"} in pack · choose format`
      : step === "select"
        ? `${selectedCount} of ${packWordCount} selected · freezes when you generate`
        : `Draft frozen: ${draft?.wordIds.length ?? 0} word${
            (draft?.wordIds.length ?? 0) === 1 ? "" : "s"
          } · teacher preview`;

  return (
    <>
      {open ? (
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
            <p className="mt-1 text-xs text-neutral-500">{stepHint}</p>
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
            <PackMcQuizPreview
              compiled={compiled}
              onBackToFormats={backToSelect}
              backLabel="Back to word selection"
              onEditSavedQuiz={(quiz) => {
                setEditorQuiz(quiz);
                onClose();
              }}
            />
          ) : step === "select" ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900">Select words</h3>
                  <p className="mt-0.5 text-xs text-neutral-600">
                    Only checked entries will be used for this quiz
                    {formatMeta ? ` · min ${formatMeta.minWords} for ${formatMeta.label}` : ""}.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    disabled={building}
                    className="rounded border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={selectNone}
                    disabled={building}
                    className="rounded border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <p
                className={`text-xs font-medium ${
                  selectReadiness.ok ? "text-neutral-600" : "text-amber-800"
                }`}
              >
                {selectedCount} selected
                {!selectReadiness.ok && formatMeta
                  ? ` · need ${formatMeta.minWords} for ${formatMeta.label}`
                  : ""}
              </p>

              <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
                {rows.map((row) => {
                  const checked = selectedIds.has(row.id);
                  const hint = meaningHint(row);
                  return (
                    <li key={row.id}>
                      <label
                        className={`flex cursor-pointer gap-3 px-3 py-2.5 ${
                          checked ? "bg-neutral-50" : "bg-white hover:bg-neutral-50/80"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={checked}
                          disabled={building}
                          onChange={() => toggleWord(row.id)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span className="text-sm font-semibold text-neutral-900">
                              {row.lemma}
                            </span>
                            {row.readyForClass ? (
                              <span className="text-[11px] font-medium text-emerald-800">
                                Ready
                              </span>
                            ) : (
                              <span className="text-[11px] font-medium text-amber-800">
                                Not ready
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 line-clamp-2 block text-xs text-neutral-600">
                            {hint}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>

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
          ) : (
            <>
              <fieldset className="space-y-2" disabled={loadingWords || building}>
                <legend className="text-sm font-semibold text-neutral-900">Choose a format</legend>
                {PACK_QUIZ_FORMATS.map((option) => {
                  const selected = format === option.id;
                  const optionReady = packQuizFormatReadiness(option.id, packWordCount);
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
                          {!optionReady.ok ? " · not enough words in pack yet" : ""}
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
              onClick={() => void onContinueToSelect()}
              disabled={loadingWords}
              className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
            >
              {loadingWords ? "Loading words…" : "Continue"}
            </button>
          </footer>
        ) : null}

        {step === "select" ? (
          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-neutral-100 px-4 py-3">
            <button
              type="button"
              onClick={resetToFormats}
              disabled={building}
              className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
            >
              Back to formats
            </button>
            <button
              type="button"
              onClick={() => void onGenerate()}
              disabled={building || !selectReadiness.ok}
              className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
            >
              {building ? "Building…" : "Generate"}
            </button>
          </footer>
        ) : null}
      </div>
    </div>
      ) : null}

      <PackQuizEditorOverlay
        open={Boolean(editorQuiz)}
        onClose={() => setEditorQuiz(null)}
        quizId={editorQuiz?.id ?? ""}
        quizTitle={editorQuiz?.title ?? ""}
      />
    </>
  );
}
