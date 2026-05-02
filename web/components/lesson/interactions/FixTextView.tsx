"use client";

import Image from "next/image";
import { clsx } from "clsx";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import { speakText, speakTextAndWait } from "@/lib/audio/tts";
import { countKeywordMatchesInText } from "@/lib/essay-keyword-feedback";
import type { ScreenPayload } from "@/lib/lesson-schemas";
import {
  GuideBlock,
  interactionImageFitClass,
  NavProps,
  unopt,
  normalizeText,
  splitWordTokens,
  wordRegions,
  fixTextWordNeedsCorrection,
  buildFixTextHintChoices,
} from "./shared";

export function FixTextView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "fix_text" }>;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps) {
  const [value, setValue] = useState(parsed.broken_text);
  const [checkHint, setCheckHint] = useState<null | "ok" | "bad">(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [shookIndex, setShookIndex] = useState<number | null>(null);
  const [hintSpotTiles, setHintSpotTiles] = useState<number[]>([]);
  const [hintChoices, setHintChoices] = useState<string[] | null>(null);
  const [hintChoicesForIndex, setHintChoicesForIndex] = useState<number | null>(null);
  const [bubbleMsg, setBubbleMsg] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const hintChoicesForIdxRef = useRef<number | null>(null);

  const hintsEnabled = parsed.hints_enabled ?? true;
  const ci = parsed.case_insensitive ?? true;
  const nw = parsed.normalize_whitespace ?? true;

  const primaryTarget = parsed.acceptable[0] ?? "";
  const targetWords = useMemo(() => splitWordTokens(primaryTarget), [primaryTarget]);
  const decoyWords = useMemo(
    () => (parsed.hint_decoy_words ?? []).map((w) => w.trim()).filter(Boolean),
    [parsed.hint_decoy_words],
  );

  const regions = useMemo(() => wordRegions(value), [value]);

  const wrongIndices = useMemo(
    () =>
      regions
        .map((_, i) => i)
        .filter((i) => fixTextWordNeedsCorrection(regions, targetWords, i, ci, nw)),
    [regions, targetWords, ci, nw],
  );

  useLayoutEffect(() => {
    hintChoicesForIdxRef.current = hintChoicesForIndex;
  }, [hintChoicesForIndex]);

  useLayoutEffect(() => {
    if (editIndex === null) return;
    const el = editInputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [editIndex]);

  useEffect(() => {
    if (shookIndex === null) return;
    const t = window.setTimeout(() => setShookIndex(null), 480);
    return () => window.clearTimeout(t);
  }, [shookIndex]);

  useEffect(() => {
    if (!bubbleMsg) return;
    const t = window.setTimeout(() => setBubbleMsg(null), 3800);
    return () => window.clearTimeout(t);
  }, [bubbleMsg]);

  function applyValue(next: string) {
    setCheckHint(null);
    setValue(next);
  }

  function replaceWordAtIndex(i: number, piece: string) {
    const r = regions[i];
    if (!r) return;
    const w = piece.trim();
    if (!w || /\s/.test(w)) return;
    playSfx("tap", muted);
    applyValue(value.slice(0, r.start) + w + value.slice(r.end));
    if (hintChoicesForIdxRef.current === i) {
      setHintChoices(null);
      setHintChoicesForIndex(null);
    }
  }

  function openEdit(i: number) {
    const r = regions[i];
    if (!r) return;
    setCheckHint(null);
    setHintChoices(null);
    setHintChoicesForIndex(null);
    setEditIndex(i);
    setEditDraft(r.word);
  }

  function closeEdit() {
    setEditIndex(null);
    setEditDraft("");
    setHintChoices(null);
    setHintChoicesForIndex(null);
  }

  function applyEdit() {
    if (editIndex === null) return;
    const r = regions[editIndex];
    if (!r) return;
    const piece = editDraft.trim();
    if (!piece) return;
    if (/\s/.test(piece)) return;
    replaceWordAtIndex(editIndex, piece);
    closeEdit();
  }

  function applyHintChoice(word: string) {
    if (hintChoicesForIndex === null) return;
    const idx = hintChoicesForIndex;
    const shouldClose = editIndex === idx;
    replaceWordAtIndex(idx, word);
    if (shouldClose) closeEdit();
  }

  function requestHint() {
    if (!hintsEnabled || passed) return;
    playSfx("tap", muted);
    setBubbleMsg(null);

    if (wrongIndices.length === 0) {
      setBubbleMsg("Nothing left to fix — try Check.");
      return;
    }

    const editingWrongWord =
      editIndex !== null &&
      fixTextWordNeedsCorrection(regions, targetWords, editIndex, ci, nw);

    if (editingWrongWord) {
      const choices = buildFixTextHintChoices(
        editIndex,
        regions,
        targetWords,
        decoyWords,
        ci,
        nw,
      );
      if (!choices) {
        setBubbleMsg("No multiple-choice hint for this word — type the fix instead.");
        return;
      }
      setHintChoicesForIndex(editIndex);
      setHintChoices(choices);
      setBubbleMsg("Pick the word that fits best.");
      return;
    }

    const pool = wrongIndices.filter((i) => !hintSpotTiles.includes(i));
    if (pool.length === 0) {
      setBubbleMsg("All mistakes are highlighted — tap a glowing word to fix it, then Hint for choices.");
      return;
    }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setHintSpotTiles((prev) => (prev.includes(pick) ? prev : [...prev, pick]));
    setBubbleMsg("A glowing word doesn’t match the answer yet — tap it to fix, then tap Hint again.");
  }

  function onTileActivate(i: number) {
    if (passed) return;
    playSfx("tap", muted);
    const needs = fixTextWordNeedsCorrection(regions, targetWords, i, ci, nw);
    if (needs) openEdit(i);
    else {
      setShookIndex(i);
    }
  }

  function check() {
    playSfx("tap", muted);
    const norm = normalizeText(value, ci, nw);
    const ok = parsed.acceptable.some((a: string) =>
      normalizeText(a, ci, nw) === norm,
    );
    setCheckHint(ok ? "ok" : "bad");
    if (ok) onPass();
    else onWrong();
  }

  const showChoicesUnderTiles =
    hintChoices &&
    hintChoicesForIndex !== null &&
    !(editIndex === hintChoicesForIndex);

  const showChoicesInModal =
    hintChoices &&
    hintChoicesForIndex !== null &&
    editIndex === hintChoicesForIndex;

  return (
    <div>
      {parsed.image_url ? (
        <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-lg border-4 border-kid-ink">
          <Image
            src={parsed.image_url}
            alt=""
            fill
            className={interactionImageFitClass(parsed.image_fit)}
            unoptimized={unopt(parsed.image_url)}
          />
        </div>
      ) : null}
      <KidPanel>
        {parsed.body_text ? (
          <p className="mb-4 text-lg">{parsed.body_text}</p>
        ) : null}
        <p className="mb-2 font-semibold">Fix the text:</p>
        <p className="mb-3 text-sm text-neutral-700">
          Tap words you think are wrong to fix them. If a word is already fine, it will{" "}
          <span className="font-semibold">shake</span> — try another.{" "}
          <span className="font-semibold">Hint</span> first highlights a mistake; open that word, then{" "}
          <span className="font-semibold">Hint</span> again in the box for answer choices.
        </p>

        {bubbleMsg ? (
          <p
            className="mb-3 rounded-xl border-2 border-amber-500 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950"
            role="status"
          >
            {bubbleMsg}
          </p>
        ) : null}

        {passed ? (
          <div
            className="rounded-xl border-4 border-emerald-600 bg-emerald-50 px-4 py-4 text-lg font-semibold text-emerald-950"
            role="status"
          >
            <p className="mb-1 text-base font-bold text-emerald-900">Nice work — that&apos;s correct!</p>
            <p className="whitespace-pre-wrap font-medium">{value}</p>
          </div>
        ) : regions.length === 0 ? (
          <p className="text-sm text-neutral-600">This activity has no words to fix yet.</p>
        ) : (
          <div
            className="flex flex-wrap gap-2 rounded-xl border-4 border-kid-ink bg-white px-3 py-4"
            role="list"
            aria-label="Sentence words"
          >
            {regions.map((r, i) => {
              const shaking = shookIndex === i;
              const spotlight = hintSpotTiles.includes(i);
              return (
                <button
                  key={`${r.start}-${r.end}-${i}`}
                  type="button"
                  disabled={passed}
                  onClick={() => onTileActivate(i)}
                  className={clsx(
                    "max-w-full rounded-xl border-2 border-kid-ink bg-white px-3 py-2.5 text-left text-lg font-bold text-kid-ink shadow-sm transition-transform hover:bg-amber-50/70 active:scale-[0.98]",
                    spotlight &&
                      "ring-4 ring-amber-400 ring-offset-2 ring-offset-white animate-pulse",
                    shaking && "kid-animate-shake border-red-600 bg-red-100 text-red-950",
                  )}
                  role="listitem"
                >
                  <span className="break-all">{r.word}</span>
                </button>
              );
            })}
          </div>
        )}

        {showChoicesUnderTiles ? (
          <div
            className="mt-4 rounded-xl border-4 border-amber-500 bg-amber-50/90 px-3 py-3"
            role="region"
            aria-label="Hint choices"
          >
            <p className="text-sm font-bold text-amber-950">Hint — pick the right word:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {hintChoices.map((w) => (
                <KidButton key={w} type="button" variant="accent" onClick={() => applyHintChoice(w)}>
                  {w}
                </KidButton>
              ))}
            </div>
          </div>
        ) : null}

        {parsed.acceptable.length > 1 && !passed && targetWords.length > 0 ? (
          <p className="mt-3 text-xs text-neutral-600">
            Hints use the <strong>first</strong> acceptable answer to spot mistakes. Check still
            accepts any answer your teacher allowed.
          </p>
        ) : null}

        {checkHint === "ok" && !passed ? (
          <div
            className="mt-4 rounded-xl border-4 border-emerald-600 bg-emerald-50 px-4 py-3 text-lg font-semibold text-emerald-950"
            role="status"
          >
            Correct! Your sentence matches an answer your teacher will accept.
          </div>
        ) : null}
        {checkHint === "bad" && !passed ? (
          <div
            className="mt-4 rounded-xl border-4 border-rose-600 bg-rose-50 px-4 py-3 text-lg font-semibold text-rose-950"
            role="status"
          >
            Not quite yet. Fix the sentence, then tap Check again.
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-3">
          {hintsEnabled ? (
            <KidButton type="button" variant="secondary" disabled={passed} onClick={requestHint}>
              Hint
            </KidButton>
          ) : null}
          <KidButton type="button" disabled={passed} onClick={check}>
            Check
          </KidButton>
        </div>
      </KidPanel>

      {editIndex !== null ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeEdit();
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEdit();
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border-4 border-kid-ink bg-white p-4 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fix-text-edit-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2 id="fix-text-edit-title" className="text-lg font-bold text-kid-ink">
              Type the correction
            </h2>
            <p className="mt-1 text-sm text-neutral-600">One word only (no spaces).</p>
            <input
              ref={editInputRef}
              type="text"
              autoComplete="off"
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyEdit();
                }
                if (e.key === "Escape") closeEdit();
              }}
              className="relative z-0 mt-3 w-full rounded-xl border-4 border-kid-ink px-3 py-3 text-lg outline-none focus:ring-2 focus:ring-sky-400"
              aria-label="Correction for this word"
            />
            {showChoicesInModal ? (
              <div className="relative z-10 mt-4 rounded-xl border-2 border-amber-500 bg-amber-50 px-3 py-3 shadow-sm">
                <p className="text-sm font-bold text-amber-950">Hint — pick one:</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {hintChoices!.map((w) => (
                    <KidButton
                      key={w}
                      type="button"
                      variant="accent"
                      onClick={() => applyHintChoice(w)}
                    >
                      {w}
                    </KidButton>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              {hintsEnabled ? (
                <KidButton
                  type="button"
                  variant="secondary"
                  className="mr-auto"
                  onClick={() => requestHint()}
                >
                  Hint
                </KidButton>
              ) : null}
              <KidButton type="button" variant="secondary" onClick={closeEdit}>
                Cancel
              </KidButton>
              <KidButton
                type="button"
                disabled={!editDraft.trim() || /\s/.test(editDraft.trim())}
                onClick={applyEdit}
              >
                Apply
              </KidButton>
            </div>
          </div>
        </div>
      ) : null}

      <GuideBlock guide={parsed.guide} />
      <div className="mt-6 flex flex-wrap gap-3">
        {showBack ? (
          <KidButton type="button" variant="secondary" onClick={onBack}>
            Back
          </KidButton>
        ) : null}
        <KidButton type="button" disabled={!passed} onClick={() => onNext()}>
          Next
        </KidButton>
      </div>
    </div>
  );
}
