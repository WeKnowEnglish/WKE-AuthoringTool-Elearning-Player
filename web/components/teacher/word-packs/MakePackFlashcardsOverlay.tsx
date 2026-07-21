"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { loadPackQuizLexemes } from "@/lib/actions/pack-quiz";
import { PackFlashcardPreview } from "@/components/teacher/word-packs/PackFlashcardPreview";
import { faceLabel } from "@/components/teacher/word-packs/FlashcardFaceStack";
import {
  PACK_FLASHCARD_FACES,
  compilePackFlashcards,
  createPackFlashcardDraft,
  flashcardLexemeReadinessLabel,
  freezeSelectedPackWordIds,
  packFlashcardWordReadiness,
  validatePackFlashcardOptions,
  type PackFlashcardCompileResult,
  type PackFlashcardDraft,
  type PackFlashcardFace,
  type PackFlashcardOptions,
} from "@/lib/vocabulary/pack-flashcards";
import type { PackLexemeResolution } from "@/lib/vocabulary/teacher-lexicon/resolve-pack";

type Props = {
  open: boolean;
  onClose: () => void;
  packId: string;
  packTitle: string;
  wordIds: readonly string[];
};

type Step = "configure" | "select" | "preview";

const DEFAULT_OPTIONS: PackFlashcardOptions = {
  includeFaces: ["word", "definition"],
  frontFaces: ["word"],
  backFaces: ["definition"],
  shuffle: false,
};

function toggleFace(
  list: PackFlashcardFace[],
  face: PackFlashcardFace,
): PackFlashcardFace[] {
  return list.includes(face) ? list.filter((f) => f !== face) : [...list, face];
}

function deriveOptions(
  includeFaces: PackFlashcardFace[],
  frontFaces: PackFlashcardFace[],
  shuffle: boolean,
): PackFlashcardOptions {
  const include = PACK_FLASHCARD_FACES.filter((f) => includeFaces.includes(f));
  const front = PACK_FLASHCARD_FACES.filter(
    (f) => include.includes(f) && frontFaces.includes(f),
  );
  const back = include.filter((f) => !front.includes(f));
  return { includeFaces: include, frontFaces: front, backFaces: back, shuffle };
}

export function MakePackFlashcardsOverlay({
  open,
  onClose,
  packId,
  packTitle,
  wordIds,
}: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [includeFaces, setIncludeFaces] = useState<PackFlashcardFace[]>([
    "word",
    "definition",
  ]);
  const [frontFaces, setFrontFaces] = useState<PackFlashcardFace[]>(["word"]);
  const [shuffle, setShuffle] = useState(false);
  const [draft, setDraft] = useState<PackFlashcardDraft | null>(null);
  const [gateMessage, setGateMessage] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("configure");
  const [compiled, setCompiled] = useState<PackFlashcardCompileResult | null>(null);
  const [building, setBuilding] = useState(false);
  const [loadingWords, setLoadingWords] = useState(false);
  const [lexemes, setLexemes] = useState<PackLexemeResolution[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const packWordCount = wordIds.length;
  const selectedCount = selectedIds.size;
  const options = useMemo(
    () => deriveOptions(includeFaces, frontFaces, shuffle),
    [includeFaces, frontFaces, shuffle],
  );
  const optionsValidation = useMemo(
    () => validatePackFlashcardOptions(options),
    [options],
  );
  const packReadiness = packFlashcardWordReadiness(packWordCount);
  const selectReadiness = packFlashcardWordReadiness(selectedCount);

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
    setIncludeFaces([...DEFAULT_OPTIONS.includeFaces]);
    setFrontFaces([...DEFAULT_OPTIONS.frontFaces]);
    setShuffle(false);
    setDraft(null);
    setGateMessage(null);
    setStep("configure");
    setCompiled(null);
    setBuilding(false);
    setLoadingWords(false);
    setLexemes([]);
    setSelectedIds(new Set(wordIds));
    const t = window.setTimeout(() => closeRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset on open/packId
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

  function resetToConfigure() {
    setStep("configure");
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

  async function onContinueToSelect() {
    setGateMessage(null);
    setDraft(null);
    setCompiled(null);

    if (!packReadiness.ok) {
      setGateMessage(packReadiness.reason ?? "Pack isn’t ready.");
      return;
    }
    if (!optionsValidation.ok) {
      setGateMessage(optionsValidation.errors[0] ?? "Fix face settings first.");
      return;
    }

    setLoadingWords(true);
    try {
      const loaded = await loadPackQuizLexemes({ packId, wordIds });
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
      setGateMessage(selectReadiness.reason ?? "Select at least one word.");
      setDraft(null);
      setCompiled(null);
      return;
    }
    if (!optionsValidation.ok) {
      setGateMessage(optionsValidation.errors[0] ?? "Invalid face settings.");
      return;
    }

    const next = createPackFlashcardDraft({
      packId,
      packTitle,
      wordIds: frozenIds,
      options: optionsValidation.options,
    });
    setDraft(next);
    setBuilding(true);
    try {
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

      const result = compilePackFlashcards({
        draft: next,
        lexemes: pool,
        seed: next.createdAt,
      });

      if (result.cards.length === 0) {
        setGateMessage(
          result.warnings.join(" ") || "Could not build flashcards from the selected words.",
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

  const wide = step === "preview" || step === "select";
  const stepHint =
    step === "configure"
      ? `${packWordCount} word${packWordCount === 1 ? "" : "s"} in pack · choose faces`
      : step === "select"
        ? `${selectedCount} of ${packWordCount} selected · freezes when you generate`
        : `Draft frozen: ${draft?.wordIds.length ?? 0} word${
            (draft?.wordIds.length ?? 0) === 1 ? "" : "s"
          } · teacher preview`;

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
              Make flashcards
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
            <PackFlashcardPreview
              compiled={compiled}
              onBack={backToSelect}
              backLabel="Back to word selection"
            />
          ) : step === "select" ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900">Select words</h3>
                  <p className="mt-0.5 text-xs text-neutral-600">
                    Only checked entries become cards · needs{" "}
                    {options.includeFaces.map(faceLabel).join(", ")}.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIds(new Set(wordIds));
                      setGateMessage(null);
                      setDraft(null);
                      setCompiled(null);
                    }}
                    disabled={building}
                    className="rounded border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIds(new Set());
                      setGateMessage(null);
                      setDraft(null);
                      setCompiled(null);
                    }}
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
                {!selectReadiness.ok ? " · select at least 1 word" : ""}
              </p>

              <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
                {rows.map((row) => {
                  const checked = selectedIds.has(row.id);
                  const readiness = flashcardLexemeReadinessLabel(
                    row,
                    options.includeFaces,
                  );
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
                            <span
                              className={`text-[11px] font-medium ${
                                readiness === "Ready"
                                  ? "text-emerald-800"
                                  : "text-amber-800"
                              }`}
                            >
                              {readiness}
                            </span>
                          </span>
                          <span className="mt-0.5 line-clamp-2 block text-xs text-neutral-600">
                            {row.definitionEn?.trim() ||
                              row.definitionVi?.trim() ||
                              "No definition yet"}
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
                </div>
              ) : null}
            </>
          ) : (
            <>
              <fieldset className="space-y-2" disabled={loadingWords || building}>
                <legend className="text-sm font-semibold text-neutral-900">
                  Include faces
                </legend>
                <p className="text-xs text-neutral-600">
                  Students only see word, definition, example, and picture. Pick at least two.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {PACK_FLASHCARD_FACES.map((face) => {
                    const checked = includeFaces.includes(face);
                    return (
                      <label
                        key={face}
                        className={`flex cursor-pointer gap-2 rounded-lg border px-3 py-2 ${
                          checked
                            ? "border-neutral-900 bg-neutral-50"
                            : "border-neutral-200 hover:border-neutral-400"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setIncludeFaces((prev) => {
                              const next = toggleFace(prev, face);
                              setFrontFaces((front) =>
                                front.filter((f) => next.includes(f)),
                              );
                              return next;
                            });
                            setGateMessage(null);
                          }}
                        />
                        <span className="text-sm font-semibold text-neutral-900">
                          {faceLabel(face)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="space-y-2" disabled={loadingWords || building}>
                <legend className="text-sm font-semibold text-neutral-900">
                  Front of card
                </legend>
                <p className="text-xs text-neutral-600">
                  Checked faces show first; the rest go on the back.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {options.includeFaces.map((face) => {
                    const checked = frontFaces.includes(face);
                    return (
                      <label
                        key={face}
                        className={`flex cursor-pointer gap-2 rounded-lg border px-3 py-2 ${
                          checked
                            ? "border-neutral-900 bg-neutral-50"
                            : "border-neutral-200 hover:border-neutral-400"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setFrontFaces((prev) => toggleFace(prev, face));
                            setGateMessage(null);
                          }}
                        />
                        <span className="text-sm font-semibold text-neutral-900">
                          {faceLabel(face)}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {options.backFaces.length > 0 ? (
                  <p className="text-xs text-neutral-600">
                    Back: {options.backFaces.map(faceLabel).join(", ")}
                  </p>
                ) : (
                  <p className="text-xs font-medium text-amber-800">
                    Leave at least one face for the back.
                  </p>
                )}
              </fieldset>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-800">
                <input
                  type="checkbox"
                  checked={shuffle}
                  onChange={(e) => setShuffle(e.target.checked)}
                />
                Shuffle card order
              </label>

              {gateMessage ? (
                <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                  <p>{gateMessage}</p>
                </div>
              ) : null}
            </>
          )}
        </div>

        {step === "configure" ? (
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
              disabled={loadingWords || !optionsValidation.ok}
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
              onClick={resetToConfigure}
              disabled={building}
              className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
            >
              Back to faces
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
  );
}
