"use client";

import Image from "next/image";
import { clsx } from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { uploadStudentVoiceSubmission } from "@/lib/actions/student-voice";
import { playSfx } from "@/lib/audio/sfx";
import { countKeywordMatchesInText } from "@/lib/essay-keyword-feedback";
import { getProgressSnapshot } from "@/lib/progress/local-storage";
import type { ScreenPayload } from "@/lib/lesson-schemas";

export function GuideBlock({
  guide,
}: {
  guide?: { image_url?: string; tip_text?: string };
}) {
  if (!guide?.tip_text && !guide?.image_url) return null;
  return (
    <KidPanel className="mt-4 flex gap-3 border-kid-ink bg-kid-cta/25">
      {guide.image_url ? (
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border-2 border-kid-ink">
          <Image
            src={guide.image_url}
            alt="Guide"
            width={80}
            height={80}
            className="object-cover"
            unoptimized={guide.image_url.includes("placehold.co")}
          />
        </div>
      ) : null}
      <div className="flex-1">
        {guide.tip_text ? (
          <p className="text-base font-medium leading-relaxed text-kid-ink">{guide.tip_text}</p>
        ) : null}
      </div>
    </KidPanel>
  );
}

function unopt(url: string) {
  return url.includes("placehold.co");
}

function seededHash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function deterministicShuffle<T>(items: T[], seedText: string): T[] {
  const out = [...items];
  let seed = seededHash(seedText);
  for (let i = out.length - 1; i > 0; i -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const lastMcQuizOrderBySignature = new Map<string, string>();

function orderSignature(options: { id: string }[]): string {
  return options.map((o) => o.id).join("|");
}

function normalizeText(
  s: string,
  caseInsensitive: boolean,
  normalizeWhitespace: boolean,
): string {
  let t = s;
  if (normalizeWhitespace) t = t.trim().replace(/\s+/g, " ");
  if (caseInsensitive) t = t.toLowerCase();
  return t;
}

/** Non-whitespace runs (words + attached punctuation), same as student typing. */
function splitWordTokens(s: string): string[] {
  return s.match(/\S+/g) ?? [];
}

function wordRegions(s: string): { word: string; start: number; end: number }[] {
  const out: { word: string; start: number; end: number }[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    out.push({ word: m[0], start: m.index, end: m.index + m[0].length });
  }
  return out;
}

function wordMatchToken(
  a: string,
  b: string,
  caseInsensitive: boolean,
  normalizeWhitespace: boolean,
): boolean {
  return (
    normalizeText(a, caseInsensitive, normalizeWhitespace) ===
    normalizeText(b, caseInsensitive, normalizeWhitespace)
  );
}

/** Longest prefix of word tokens that match the target sentence (first acceptable answer). */
function countLockedPrefix(
  regions: { word: string }[],
  targetWords: string[],
  caseInsensitive: boolean,
  normalizeWhitespace: boolean,
): number {
  let n = 0;
  const max = Math.min(regions.length, targetWords.length);
  for (let i = 0; i < max; i++) {
    if (
      wordMatchToken(
        regions[i].word,
        targetWords[i],
        caseInsensitive,
        normalizeWhitespace,
      )
    ) {
      n += 1;
    } else break;
  }
  return n;
}

type NavProps = {
  muted: boolean;
  passed: boolean;
  onNext: () => void;
  onBack: () => void;
  showBack: boolean;
};

export function McQuizView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "mc_quiz" }>;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps) {
  const optionsSignature = useMemo(
    () => JSON.stringify(parsed.options.map((opt: { id: string; label: string }) => [opt.id, opt.label])),
    [parsed.options],
  );
  const [shuffleSeed, setShuffleSeed] = useState("initial");
  useEffect(() => {
    const buf = new Uint32Array(2);
    crypto.getRandomValues(buf);
    // Seed updates when this quiz payload loads, not when answer clicks re-render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShuffleSeed(`${buf[0].toString(36)}-${buf[1].toString(36)}`);
  }, [parsed.question, parsed.image_url, optionsSignature, parsed.shuffle_options]);
  const displayOptions = useMemo(() => {
    if (!parsed.shuffle_options) return parsed.options;
    const quizSig = optionsSignature;
    const prevOrder = lastMcQuizOrderBySignature.get(quizSig) ?? null;

    // Keep order stable during one loaded attempt, but pick a new order on the next load.
    let next = deterministicShuffle(parsed.options, `${optionsSignature}:${shuffleSeed}`);
    let nextOrder = orderSignature(next);

    // If we happened to pick the same order as the previous load, retry with a different seed.
    // This avoids "it looks like it didn't shuffle" when there are only 2 options.
    if (prevOrder && nextOrder === prevOrder && parsed.options.length > 1) {
      for (let i = 0; i < 4; i += 1) {
        next = deterministicShuffle(parsed.options, `${optionsSignature}:${shuffleSeed}:${i + 1}`);
        nextOrder = orderSignature(next);
        if (nextOrder !== prevOrder) break;
      }
    }

    lastMcQuizOrderBySignature.set(quizSig, nextOrder);
    return next;
  }, [parsed.shuffle_options, parsed.options, optionsSignature, shuffleSeed]);
  const imageFitClass = parsed.image_fit === "contain" ? "object-contain bg-white" : "object-cover";

  return (
    <div>
      {parsed.image_url ? (
        <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-lg border-4 border-kid-ink">
          <Image
            src={parsed.image_url}
            alt=""
            fill
            className={imageFitClass}
            unoptimized={unopt(parsed.image_url)}
          />
        </div>
      ) : null}
      <KidPanel>
        <p className="text-xl font-semibold">{parsed.question}</p>
        <div className="mt-4 grid gap-3">
          {displayOptions.map((opt: { id: string; label: string }) => (
            <KidButton
              key={opt.id}
              type="button"
              variant="secondary"
              disabled={passed}
              className="w-full text-left"
              onClick={() => {
                playSfx("tap", muted);
                if (opt.id === parsed.correct_option_id) onPass();
                else onWrong();
              }}
            >
              {opt.label}
            </KidButton>
          ))}
        </div>
      </KidPanel>
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

export function TrueFalseView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "true_false" }>;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps) {
  return (
    <div>
      {parsed.image_url ? (
        <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-lg border-4 border-kid-ink">
          <Image
            src={parsed.image_url}
            alt=""
            fill
            className="object-cover"
            unoptimized={unopt(parsed.image_url)}
          />
        </div>
      ) : null}
      <KidPanel>
        <p className="text-xl font-semibold">{parsed.statement}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <KidButton
            type="button"
            variant="secondary"
            disabled={passed}
            className="min-w-[8rem]"
            onClick={() => {
              playSfx("tap", muted);
              if (parsed.correct) onPass();
              else onWrong();
            }}
          >
            True
          </KidButton>
          <KidButton
            type="button"
            variant="secondary"
            disabled={passed}
            className="min-w-[8rem]"
            onClick={() => {
              playSfx("tap", muted);
              if (!parsed.correct) onPass();
              else onWrong();
            }}
          >
            False
          </KidButton>
        </div>
      </KidPanel>
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

export function ShortAnswerView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "short_answer" }>;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps) {
  const [value, setValue] = useState("");
  const ci = parsed.case_insensitive ?? true;
  const nw = parsed.normalize_whitespace ?? true;

  function check() {
    playSfx("tap", muted);
    const norm = normalizeText(value, ci, nw);
    const ok = parsed.acceptable_answers.some((a: string) =>
      normalizeText(a, ci, nw) === norm,
    );
    if (ok) onPass();
    else onWrong();
  }

  return (
    <div>
      {parsed.image_url ? (
        <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-lg border-4 border-kid-ink">
          <Image
            src={parsed.image_url}
            alt=""
            fill
            className="object-cover"
            unoptimized={unopt(parsed.image_url)}
          />
        </div>
      ) : null}
      <KidPanel>
        <p className="text-xl font-semibold">{parsed.prompt}</p>
        <input
          type="text"
          value={value}
          disabled={passed}
          onChange={(e) => setValue(e.target.value)}
          className="mt-4 w-full rounded-lg border-4 border-kid-ink px-3 py-3 text-lg"
          placeholder="Your answer"
          aria-label="Answer"
        />
        <div className="mt-4">
          <KidButton type="button" disabled={passed || !value.trim()} onClick={check}>
            Check
          </KidButton>
        </div>
      </KidPanel>
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
  const ci = parsed.case_insensitive ?? true;
  const nw = parsed.normalize_whitespace ?? true;

  const primaryTarget = parsed.acceptable[0] ?? "";
  const targetWords = useMemo(() => splitWordTokens(primaryTarget), [primaryTarget]);

  const regions = useMemo(() => wordRegions(value), [value]);

  const lockedCount = useMemo(() => {
    if (passed) return regions.length;
    if (targetWords.length === 0) return 0;
    return countLockedPrefix(regions, targetWords, ci, nw);
  }, [passed, regions, targetWords, ci, nw]);

  const prefixLen = useMemo(() => {
    if (lockedCount === 0 || regions.length === 0) return 0;
    const idx = Math.min(lockedCount, regions.length) - 1;
    return regions[idx].end;
  }, [lockedCount, regions]);

  const tail = value.slice(prefixLen);
  const useSplitEditor =
    !passed && primaryTarget.length > 0 && targetWords.length > 0;

  function applyValue(next: string) {
    setCheckHint(null);
    setValue(next);
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

  return (
    <div>
      {parsed.image_url ? (
        <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-lg border-4 border-kid-ink">
          <Image
            src={parsed.image_url}
            alt=""
            fill
            className="object-cover"
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
          Words you get right from the <strong>start</strong> of the sentence turn{" "}
          <span className="font-semibold text-emerald-800">green</span> and stay put — keep typing in
          the box to fix the rest. Words you still need to fix show up in{" "}
          <span className="font-semibold text-rose-800">red</span> until they match.
        </p>

        {passed ? (
          <div
            className="rounded-xl border-4 border-emerald-600 bg-emerald-50 px-4 py-4 text-lg font-semibold text-emerald-950"
            role="status"
          >
            <p className="mb-1 text-base font-bold text-emerald-900">Nice work — that&apos;s correct!</p>
            <p className="whitespace-pre-wrap font-medium">{value}</p>
          </div>
        ) : useSplitEditor ? (
          <div className="space-y-2">
            <div className="flex min-h-[3.5rem] flex-wrap items-center gap-2 rounded-xl border-4 border-kid-ink bg-white px-2 py-2">
              {lockedCount > 0
                ? regions.slice(0, lockedCount).map((r, i) => (
                    <span
                      key={`lock-${r.start}-${i}`}
                      className="inline-flex items-center rounded-lg border-2 border-emerald-600 bg-emerald-100 px-2.5 py-1.5 text-lg font-semibold text-emerald-950 shadow-sm"
                      aria-hidden
                    >
                      {r.word}
                    </span>
                  ))
                : null}
              <textarea
                value={tail}
                disabled={passed}
                onChange={(e) => applyValue(value.slice(0, prefixLen) + e.target.value)}
                rows={2}
                className="min-h-[3rem] min-w-[8rem] flex-1 resize-y rounded-lg border-2 border-dashed border-neutral-400 bg-amber-50/40 px-2 py-2 text-lg outline-none focus:border-kid-ink focus:bg-white"
                aria-label="Type the rest of the corrected sentence here"
              />
            </div>
            {parsed.acceptable.length > 1 ? (
              <p className="text-xs text-neutral-600">
                Tip: Your teacher may count other correct answers too. Green locks follow the{" "}
                <strong>first</strong> answer in their list.
              </p>
            ) : null}
          </div>
        ) : (
          <textarea
            value={value}
            disabled={passed}
            onChange={(e) => applyValue(e.target.value)}
            rows={4}
            className="w-full rounded-lg border-4 border-kid-ink px-3 py-3 text-lg"
            aria-label="Corrected text"
          />
        )}

        {targetWords.length > 0 && !passed ? (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-semibold text-neutral-800">Word check (live)</p>
            <div className="flex flex-wrap gap-1.5" role="list" aria-label="Word by word progress">
              {regions.length === 0 ? (
                <span className="text-sm text-neutral-500">Start typing above…</span>
              ) : (
                regions.map((r, i) => {
                  const isLocked = i < lockedCount;
                  const matchesTarget =
                    i < targetWords.length &&
                    wordMatchToken(r.word, targetWords[i], ci, nw);
                  const chip = clsx(
                    "inline-flex max-w-full rounded-lg border-2 px-2 py-1 text-base font-semibold transition-colors",
                    isLocked &&
                      "border-emerald-600 bg-emerald-100 text-emerald-950 shadow-sm",
                    !isLocked &&
                      matchesTarget &&
                      "border-amber-500 bg-amber-100 text-amber-950",
                    !isLocked && !matchesTarget && "border-rose-600 bg-rose-50 text-rose-950",
                  );
                  return (
                    <span key={`w-${r.start}-${i}`} className={chip} role="listitem">
                      {r.word}
                    </span>
                  );
                })
              )}
            </div>
          </div>
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
            Not quite yet. Fix the red words (or the whole sentence), then tap Check again.
          </div>
        ) : null}

        <div className="mt-4">
          <KidButton type="button" disabled={passed} onClick={check}>
            Check
          </KidButton>
        </div>
      </KidPanel>
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

export function FillBlanksView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "fill_blanks" }>;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      parsed.blanks.map((b: { id: string }): [string, string] => [b.id, ""]),
    ),
  );
  const [lockedCorrectIds, setLockedCorrectIds] = useState<Set<string>>(() => new Set());
  const [wrongHint, setWrongHint] = useState<string | null>(null);
  const blanksSignature = useMemo(
    () =>
      parsed.blanks
        .map((b) => `${b.id}:${b.acceptable.map((a) => a.trim().toLowerCase()).join("|")}`)
        .join("||"),
    [parsed.blanks],
  );

  useEffect(() => {
    setAnswers(
      Object.fromEntries(parsed.blanks.map((b: { id: string }): [string, string] => [b.id, ""])),
    );
    setLockedCorrectIds(new Set());
    setWrongHint(null);
  }, [parsed.template, blanksSignature]);

  const parts = useMemo((): { type: "text" | "blank"; value: string }[] => {
    const template = parsed.template;
    const re = /__([^_]+)__/g;
    const out: { type: "text" | "blank"; value: string }[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(template)) !== null) {
      if (m.index > last) {
        out.push({ type: "text", value: template.slice(last, m.index) });
      }
      out.push({ type: "blank", value: m[1] });
      last = m.index + m[0].length;
    }
    if (last < template.length) {
      out.push({ type: "text", value: template.slice(last) });
    }
    return out;
  }, [parsed.template]);

  function check() {
    playSfx("tap", muted);
    const nextLocked = new Set(lockedCorrectIds);
    const wrongIds: string[] = [];

    for (const b of parsed.blanks) {
      const raw = (answers[b.id] ?? "").trim();
      const norm = raw.toLowerCase().replace(/\s+/g, " ");
      const ok = b.acceptable.some(
        (a: string) => a.trim().toLowerCase().replace(/\s+/g, " ") === norm,
      );
      if (ok) nextLocked.add(b.id);
      else wrongIds.push(b.id);
    }

    setLockedCorrectIds(nextLocked);

    if (wrongIds.length > 0) {
      setAnswers((prev) => {
        const next = { ...prev };
        for (const id of wrongIds) {
          next[id] = "";
        }
        return next;
      });
      setWrongHint("Not quite yet. Correct words are locked in green. Try again for the empty blanks.");
      onWrong();
      return;
    }
    setWrongHint(null);
    onPass();
  }

  const imageFitClass = parsed.image_fit === "contain" ? "object-contain bg-white" : "object-cover";
  const imageSizeClass = parsed.image_size === "small" ? "max-w-xl" : "max-w-4xl";

  return (
    <div>
      {parsed.image_url ? (
        <div className={clsx("relative mb-4 aspect-video w-full overflow-hidden rounded-lg border-4 border-kid-ink", imageSizeClass)}>
          <Image
            src={parsed.image_url}
            alt=""
            fill
            className={imageFitClass}
            unoptimized={unopt(parsed.image_url)}
          />
        </div>
      ) : null}
      <KidPanel>
        {parsed.body_text ? (
          <p className="mb-4 text-lg">{parsed.body_text}</p>
        ) : null}
        <p className="mb-2 text-xl leading-relaxed">
          {parts.map((p, i) =>
            p.type === "text" ? (
              <span key={i}>{p.value}</span>
            ) : (
              <input
                key={i}
                type="text"
                disabled={passed || lockedCorrectIds.has(p.value)}
                value={answers[p.value] ?? ""}
                onChange={(e) =>
                  setAnswers((prev) => {
                    if (wrongHint) setWrongHint(null);
                    return { ...prev, [p.value]: e.target.value };
                  })
                }
                className={clsx(
                  "mx-1 inline-block w-28 rounded border-2 px-1 py-0.5 align-baseline text-lg",
                  lockedCorrectIds.has(p.value)
                    ? "border-emerald-700 bg-emerald-50 text-emerald-900"
                    : "border-neutral-800",
                )}
                aria-label={`Blank ${p.value}`}
              />
            ),
          )}
        </p>
        {parsed.word_bank && parsed.word_bank.length > 0 ? (
          <div className="mt-4">
            <p className="mb-2 font-semibold">Word bank</p>
            <p className="rounded-lg border-2 border-kid-ink/20 bg-kid-panel px-3 py-2 text-lg font-semibold text-neutral-800">
              {parsed.word_bank.join(" · ")}
            </p>
          </div>
        ) : null}
        {wrongHint ? (
          <p className="mt-3 rounded-md border-2 border-red-300 bg-red-50 px-3 py-2 text-base font-semibold text-red-900">
            {wrongHint}
          </p>
        ) : null}
        <div className="mt-4">
          <KidButton type="button" disabled={passed} onClick={check}>
            Check
          </KidButton>
        </div>
      </KidPanel>
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

export function EssayView({
  parsed,
  muted,
  passed,
  onPass,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "essay" }>;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
} & Omit<NavProps, "onWrong">) {
  const [text, setText] = useState("");
  const min = parsed.min_chars ?? 0;
  const canSubmit = text.trim().length >= min;
  const keywords = parsed.keywords ?? [];
  const showKw = parsed.show_keywords_to_students === true;

  const keywordSummary =
    passed && keywords.length > 0
      ? countKeywordMatchesInText(text, keywords)
      : null;

  return (
    <div>
      {parsed.image_url ? (
        <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-lg border-4 border-kid-ink">
          <Image
            src={parsed.image_url}
            alt=""
            fill
            className="object-cover"
            unoptimized={unopt(parsed.image_url)}
          />
        </div>
      ) : null}
      <KidPanel>
        <p className="text-xl font-semibold">{parsed.prompt}</p>
        {showKw && keywords.length > 0 ? (
          <div className="mt-3 rounded-lg border-2 border-dashed border-kid-ink/50 bg-amber-50/80 px-3 py-2">
            <p className="text-sm font-semibold text-kid-ink">Ideas you might use:</p>
            <ul className="mt-1 flex flex-wrap gap-2">
              {keywords.map((k: string) => (
                <li
                  key={k}
                  className="rounded-full bg-white px-2 py-0.5 text-sm text-neutral-800 shadow-sm"
                >
                  {k}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <textarea
          value={text}
          disabled={passed}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          className="mt-4 w-full rounded-lg border-4 border-kid-ink px-3 py-3 text-lg"
          placeholder="Write here…"
          aria-label="Essay"
        />
        {min > 0 ? (
          <p className="mt-2 text-sm text-neutral-600">
            At least {min} characters ({text.trim().length}/{min})
          </p>
        ) : null}
        <div className="mt-4">
          <KidButton
            type="button"
            disabled={passed || !canSubmit}
            onClick={() => {
              playSfx("tap", muted);
              onPass();
            }}
          >
            Submit
          </KidButton>
        </div>
        {passed ? (
          <div className="mt-4 space-y-2 rounded-lg border-2 border-green-800/30 bg-green-50/90 px-3 py-3 text-kid-ink">
            {parsed.feedback_text ? (
              <p className="text-lg leading-snug">{parsed.feedback_text}</p>
            ) : null}
            {keywordSummary && keywordSummary.total > 0 ? (
              <p className="text-base text-neutral-800">
                You used {keywordSummary.matched} of {keywordSummary.total} suggested idea
                {keywordSummary.total === 1 ? "" : "s"} in your writing.
              </p>
            ) : null}
            {!parsed.feedback_text && (!keywordSummary || keywordSummary.total === 0) ? (
              <p className="text-lg font-semibold">Nice work!</p>
            ) : null}
          </div>
        ) : null}
      </KidPanel>
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

export function HotspotInfoView({
  parsed,
  muted,
  passed: _passed,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "hotspot_info" }>;
} & NavProps) {
  const [viewed, setViewed] = useState<Set<string>>(() => new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const req = parsed.require_all_viewed ?? false;
  const allViewed =
    !req || parsed.hotspots.every((h: { id: string }) => viewed.has(h.id));

  function tapHotspot(id: string) {
    playSfx("tap", muted);
    setViewed((s) => new Set(s).add(id));
    setOpenId(id);
  }

  const open = openId
    ? parsed.hotspots.find((h: (typeof parsed.hotspots)[number]) => h.id === openId)
    : null;

  return (
    <div>
      <KidPanel>
        {parsed.body_text ? (
          <p className="mb-4 text-xl font-semibold">{parsed.body_text}</p>
        ) : null}
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border-4 border-kid-ink">
          <Image
            src={parsed.image_url}
            alt="Scene"
            fill
            className="object-cover"
            unoptimized={unopt(parsed.image_url)}
          />
          {parsed.hotspots.map((h: (typeof parsed.hotspots)[number]) => (
            <button
              key={h.id}
              type="button"
              className="absolute border-4 border-dashed border-sky-600 bg-sky-200/40 hover:bg-sky-300/50 active:bg-sky-400/60"
              style={{
                left: `${h.x_percent}%`,
                top: `${h.y_percent}%`,
                width: `${h.w_percent}%`,
                height: `${h.h_percent}%`,
              }}
              onClick={() => tapHotspot(h.id)}
              aria-label={h.label ?? h.title ?? "Hotspot"}
            />
          ))}
        </div>
        {open ? (
          <KidPanel className="mt-4 border-blue-900 bg-blue-50">
            {open.title ? <p className="font-bold">{open.title}</p> : null}
            {open.body ? <p className="mt-2 leading-relaxed">{open.body}</p> : null}
            <KidButton
              type="button"
              variant="secondary"
              className="mt-3"
              onClick={() => setOpenId(null)}
            >
              Close
            </KidButton>
          </KidPanel>
        ) : null}
      </KidPanel>
      <GuideBlock guide={parsed.guide} />
      <div className="mt-6 flex flex-wrap gap-3">
        {showBack ? (
          <KidButton type="button" variant="secondary" onClick={onBack}>
            Back
          </KidButton>
        ) : null}
        <KidButton type="button" disabled={req && !allViewed} onClick={() => onNext()}>
          Next
        </KidButton>
      </div>
    </div>
  );
}

export function HotspotGateView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "hotspot_gate" }>;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps) {
  const [clickedOrder, setClickedOrder] = useState<string[]>([]);
  const [clickedSet, setClickedSet] = useState<Set<string>>(() => new Set());

  const resetProgress = useCallback(() => {
    setClickedOrder([]);
    setClickedSet(new Set());
  }, []);

  function onTargetClick(id: string) {
    if (passed) return;
    playSfx("tap", muted);
    if (parsed.mode === "single") {
      if (id === parsed.correct_target_id) onPass();
      else onWrong();
      return;
    }
    if (parsed.mode === "sequence") {
      const order = parsed.order ?? [];
      const nextIdx = clickedOrder.length;
      if (order[nextIdx] === id) {
        const next = [...clickedOrder, id];
        setClickedOrder(next);
        if (next.length === order.length) onPass();
      } else {
        onWrong();
        resetProgress();
      }
      return;
    }
    if (parsed.mode === "all") {
      const next = new Set(clickedSet).add(id);
      setClickedSet(next);
      if (next.size === parsed.targets.length) onPass();
    }
  }

  return (
    <div>
      <KidPanel>
        {parsed.body_text ? (
          <p className="mb-4 text-xl font-semibold">{parsed.body_text}</p>
        ) : null}
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border-4 border-kid-ink">
          <Image
            src={parsed.image_url}
            alt="Scene"
            fill
            className="object-cover"
            unoptimized={unopt(parsed.image_url)}
          />
          {parsed.targets.map((t: (typeof parsed.targets)[number]) => (
            <button
              key={t.id}
              type="button"
              disabled={passed}
              className="absolute border-4 border-dashed border-amber-600 bg-amber-200/40 hover:bg-amber-300/50 active:bg-amber-400/60 disabled:opacity-60"
              style={{
                left: `${t.x_percent}%`,
                top: `${t.y_percent}%`,
                width: `${t.w_percent}%`,
                height: `${t.h_percent}%`,
              }}
              onClick={() => onTargetClick(t.id)}
              aria-label={t.label ?? "Target"}
            />
          ))}
        </div>
      </KidPanel>
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

export function DragMatchView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "drag_match" }>;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps) {
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  /** tokenId -> zoneId */
  const [assignment, setAssignment] = useState<Record<string, string>>({});

  const zones = parsed.zones;
  const tokens = parsed.tokens;

  function selectToken(id: string) {
    if (passed) return;
    playSfx("tap", muted);
    setSelectedToken((s) => (s === id ? null : id));
  }

  function assignToZone(zoneId: string) {
    if (passed || !selectedToken) return;
    playSfx("tap", muted);
    setAssignment((prev) => {
      const next = { ...prev };
      for (const tid of Object.keys(next)) {
        if (next[tid] === zoneId) delete next[tid];
      }
      next[selectedToken] = zoneId;
      return next;
    });
    setSelectedToken(null);
  }

  function check() {
    playSfx("tap", muted);
    for (const tok of tokens) {
      const zid = assignment[tok.id];
      if (!zid || parsed.correct_map[tok.id] !== zid) {
        onWrong();
        return;
      }
    }
    onPass();
  }

  const labelForZone = (zoneId: string) => {
    const tid = tokens.find((t: (typeof tokens)[number]) => assignment[t.id] === zoneId)?.id;
    const label = tid
      ? tokens.find((x: (typeof tokens)[number]) => x.id === tid)?.label ?? tid
      : null;
    return label;
  };

  return (
    <div>
      {parsed.image_url ? (
        <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-lg border-4 border-kid-ink">
          <Image
            src={parsed.image_url}
            alt=""
            fill
            className="object-cover"
            unoptimized={unopt(parsed.image_url)}
          />
        </div>
      ) : null}
      <KidPanel>
        {parsed.body_text ? (
          <p className="mb-4 text-lg">{parsed.body_text}</p>
        ) : null}
        <p className="mb-2 font-semibold">Tap a word, then tap a box</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {tokens.map((t: (typeof tokens)[number]) => (
            <KidButton
              key={t.id}
              type="button"
              variant={selectedToken === t.id ? "primary" : "secondary"}
              disabled={passed}
              className="!min-h-10"
              onClick={() => selectToken(t.id)}
            >
              {t.label}
            </KidButton>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {zones.map((z: (typeof zones)[number]) => {
            const placed = labelForZone(z.id);
            const label = placed ?? z.label ?? "Drop here";
            return (
              <button
                key={z.id}
                type="button"
                disabled={passed}
                onClick={() => assignToZone(z.id)}
                className="min-h-16 rounded-lg border-4 border-dashed border-neutral-700 bg-neutral-100 px-3 py-2 text-left text-lg font-semibold hover:bg-neutral-200 active:bg-neutral-300 disabled:opacity-60"
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <KidButton
            type="button"
            variant="secondary"
            disabled={passed}
            onClick={() => {
              playSfx("tap", muted);
              setAssignment({});
              setSelectedToken(null);
            }}
          >
            Clear
          </KidButton>
          <KidButton type="button" disabled={passed} onClick={check}>
            Check
          </KidButton>
        </div>
      </KidPanel>
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

export function ClickTargetsView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "click_targets" }>;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps) {
  const treasureIds = parsed.treasure_target_ids;
  const treasureMode = (treasureIds?.length ?? 0) > 0;
  const [foundTreasure, setFoundTreasure] = useState<Set<string>>(() => new Set());

  function onTargetClick(id: string) {
    if (passed) return;
    playSfx("tap", muted);
    if (treasureMode && treasureIds) {
      if (!treasureIds.includes(id)) {
        onWrong();
        return;
      }
      const next = new Set(foundTreasure).add(id);
      setFoundTreasure(next);
      if (next.size >= treasureIds.length) onPass();
      return;
    }
    if (id === parsed.correct_target_id) onPass();
    else onWrong();
  }

  const isFound = (id: string) =>
    treasureMode && treasureIds ? foundTreasure.has(id) : passed && id === parsed.correct_target_id;

  return (
    <div>
      <KidPanel>
        <p className="mb-4 text-xl font-semibold text-kid-ink">{parsed.body_text}</p>
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border-4 border-kid-ink">
          <Image
            src={parsed.image_url}
            alt="Scene"
            fill
            className="object-cover"
            unoptimized={unopt(parsed.image_url)}
          />
          {parsed.targets.map((t: (typeof parsed.targets)[number]) => (
            <button
              key={t.id}
              type="button"
              disabled={passed || (treasureMode && foundTreasure.has(t.id))}
              className={clsx(
                "absolute border-4 border-dashed border-kid-accent bg-kid-accent/30 hover:bg-kid-accent/45 active:bg-kid-accent/55 disabled:opacity-60",
                isFound(t.id) && "border-kid-success bg-kid-success/30",
              )}
              style={{
                left: `${t.x_percent}%`,
                top: `${t.y_percent}%`,
                width: `${t.w_percent}%`,
                height: `${t.h_percent}%`,
              }}
              onClick={() => onTargetClick(t.id)}
              aria-label={t.label ?? "Target"}
            />
          ))}
        </div>
        {treasureMode && treasureIds ? (
          <p className="mt-3 text-center text-lg font-bold text-kid-ink">
            Found {foundTreasure.size} / {treasureIds.length}
          </p>
        ) : null}
      </KidPanel>
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

export function PresentationInteractiveView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "presentation_interactive" }>;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps) {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [visibleBySlide, setVisibleBySlide] = useState<Record<string, Record<string, boolean>>>(
    () =>
      Object.fromEntries(
        parsed.slides.map((slide) => [
          slide.id,
          Object.fromEntries(slide.elements.map((el) => [el.id, el.visible !== false])),
        ]),
      ),
  );
  const [freeDragPos, setFreeDragPos] = useState<Record<string, { x_percent: number; y_percent: number }>>(
    {},
  );
  const [dragCheckDone, setDragCheckDone] = useState<Record<string, boolean>>({});
  const [visitedSlides, setVisitedSlides] = useState<Record<string, true>>(() =>
    parsed.slides[0] ? { [parsed.slides[0].id]: true } : {},
  );
  const [popup, setPopup] = useState<{
    title?: string;
    body?: string;
    image_url?: string;
    video_url?: string;
  } | null>(null);

  useEffect(() => {
    const firstId = parsed.slides[0]?.id;
    setActiveSlideIndex(0);
    setVisibleBySlide(
      Object.fromEntries(
        parsed.slides.map((slide) => [
          slide.id,
          Object.fromEntries(slide.elements.map((el) => [el.id, el.visible !== false])),
        ]),
      ),
    );
    setFreeDragPos({});
    setDragCheckDone({});
    setVisitedSlides(firstId ? { [firstId]: true } : {});
    setPopup(null);
  }, [parsed]);

  const slide = parsed.slides[activeSlideIndex] ?? parsed.slides[0];
  const dragStartRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  function setSlide(nextIndex: number) {
    const clamped = Math.max(0, Math.min(parsed.slides.length - 1, nextIndex));
    const nextSlide = parsed.slides[clamped];
    if (!nextSlide) return;
    setActiveSlideIndex(clamped);
    setVisitedSlides((prev) => ({ ...prev, [nextSlide.id]: true }));
  }

  function runPassCheck(nextDragDone?: Record<string, boolean>, nextVisited?: Record<string, true>) {
    if (passed) return;
    if ((parsed.pass_rule ?? "drag_targets_complete") === "visit_all_slides") {
      const visits = nextVisited ?? visitedSlides;
      const allVisited = parsed.slides.every((s) => !!visits[s.id]);
      if (allVisited) onPass();
      return;
    }
    const draggable = parsed.slides.flatMap((s) =>
      s.elements.filter((el) => el.draggable_mode === "check_target" && !!el.drop_target_id),
    );
    if (draggable.length === 0) return;
    const done = nextDragDone ?? dragCheckDone;
    if (draggable.every((el) => !!done[el.id])) onPass();
  }

  function toggleVisibility(slideId: string, elementId: string, mode: "show" | "hide" | "toggle") {
    setVisibleBySlide((prev) => {
      const currentSlide = prev[slideId] ?? {};
      const current = currentSlide[elementId] ?? true;
      const nextValue = mode === "show" ? true : mode === "hide" ? false : !current;
      return {
        ...prev,
        [slideId]: { ...currentSlide, [elementId]: nextValue },
      };
    });
  }

  function applyAction(
    action: NonNullable<Extract<ScreenPayload, { type: "interaction"; subtype: "presentation_interactive" }>["slides"][number]["elements"][number]["actions"]>[number],
  ) {
    if (!slide) return;
    if (action.type === "info_popup") {
      setPopup({
        title: action.title,
        body: action.body,
        image_url: action.image_url,
        video_url: action.video_url,
      });
      return;
    }
    if (action.type === "navigate_slide") {
      if (action.target === "next") setSlide(activeSlideIndex + 1);
      else if (action.target === "prev") setSlide(activeSlideIndex - 1);
      else if (action.target === "slide_id") {
        const idx = parsed.slides.findIndex((s) => s.id === action.slide_id);
        if (idx >= 0) setSlide(idx);
      }
      return;
    }
    if (action.type === "show_element") toggleVisibility(slide.id, action.element_id, "show");
    if (action.type === "hide_element") toggleVisibility(slide.id, action.element_id, "hide");
    if (action.type === "toggle_element") toggleVisibility(slide.id, action.element_id, "toggle");
  }

  useEffect(() => {
    if (!slide) return;
    function onMove(e: PointerEvent) {
      const drag = dragStartRef.current;
      const rect = stageRef.current?.getBoundingClientRect();
      if (!drag || !rect) return;
      const el = slide.elements.find((x) => x.id === drag.id);
      if (!el) return;
      const nx = ((e.clientX - rect.left - drag.dx) / rect.width) * 100;
      const ny = ((e.clientY - rect.top - drag.dy) / rect.height) * 100;
      setFreeDragPos((prev) => ({
        ...prev,
        [drag.id]: {
          x_percent: Math.max(0, Math.min(100 - el.w_percent, nx)),
          y_percent: Math.max(0, Math.min(100 - el.h_percent, ny)),
        },
      }));
    }
    function onUp() {
      const drag = dragStartRef.current;
      if (!drag) return;
      const dragged = slide.elements.find((x) => x.id === drag.id);
      if (
        dragged &&
        dragged.draggable_mode === "check_target" &&
        dragged.drop_target_id
      ) {
        const pos = freeDragPos[dragged.id] ?? { x_percent: dragged.x_percent, y_percent: dragged.y_percent };
        const target = slide.elements.find((x) => x.id === dragged.drop_target_id);
        if (target) {
          const cx = pos.x_percent + dragged.w_percent / 2;
          const cy = pos.y_percent + dragged.h_percent / 2;
          const hit =
            cx >= target.x_percent &&
            cx <= target.x_percent + target.w_percent &&
            cy >= target.y_percent &&
            cy <= target.y_percent + target.h_percent;
          if (hit) {
            setDragCheckDone((prev) => {
              const next = { ...prev, [dragged.id]: true };
              runPassCheck(next);
              return next;
            });
          } else {
            onWrong();
          }
        }
      }
      dragStartRef.current = null;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [freeDragPos, onWrong, slide, passed]);

  useEffect(() => {
    runPassCheck(undefined, visitedSlides);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitedSlides]);

  if (!slide) return null;

  return (
    <div>
      <KidPanel>
        {parsed.title ? <p className="mb-1 text-xl font-bold text-kid-ink">{parsed.title}</p> : null}
        {parsed.body_text ? <p className="mb-3 text-base text-kid-ink">{parsed.body_text}</p> : null}
        <div className="mb-2 flex items-center justify-between text-sm font-semibold text-kid-ink">
          <span>{slide.title || `Slide ${activeSlideIndex + 1}`}</span>
          <span>
            {activeSlideIndex + 1} / {parsed.slides.length}
          </span>
        </div>
        <div
          ref={stageRef}
          className="relative aspect-video w-full overflow-hidden rounded-lg border-4 border-kid-ink bg-white"
          style={{
            backgroundColor: slide.background_color ?? "#ffffff",
          }}
        >
          {slide.background_image_url ? (
            <Image
              src={slide.background_image_url}
              alt=""
              fill
              className={(slide.image_fit ?? "cover") === "contain" ? "object-contain" : "object-cover"}
              unoptimized={unopt(slide.background_image_url)}
            />
          ) : null}
          {slide.elements
            .filter((el) => (visibleBySlide[slide.id]?.[el.id] ?? el.visible ?? true))
            .sort((a, b) => (a.z_index ?? 0) - (b.z_index ?? 0))
            .map((el) => {
              const pos = freeDragPos[el.id] ?? { x_percent: el.x_percent, y_percent: el.y_percent };
              const draggable = el.draggable_mode === "free" || el.draggable_mode === "check_target";
              return (
                <button
                  key={el.id}
                  type="button"
                  className={clsx(
                    "absolute overflow-hidden rounded border-2 text-left",
                    el.kind === "button" ? "border-kid-accent bg-kid-accent/30" : "border-kid-ink/50 bg-white/40",
                    dragCheckDone[el.id] && "border-kid-success bg-kid-success/30",
                  )}
                  style={{
                    left: `${pos.x_percent}%`,
                    top: `${pos.y_percent}%`,
                    width: `${el.w_percent}%`,
                    height: `${el.h_percent}%`,
                    zIndex: el.z_index ?? 0,
                    color: el.color_hex ?? undefined,
                  }}
                  onPointerDown={(e) => {
                    if (!draggable || passed) return;
                    const rect = stageRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    dragStartRef.current = {
                      id: el.id,
                      dx: e.clientX - rect.left - (pos.x_percent / 100) * rect.width,
                      dy: e.clientY - rect.top - (pos.y_percent / 100) * rect.height,
                    };
                  }}
                  onClick={() => {
                    if (passed) return;
                    playSfx("tap", muted);
                    for (const action of el.actions ?? []) applyAction(action);
                  }}
                >
                  {el.image_url ? (
                    <Image
                      src={el.image_url}
                      alt={el.label ?? ""}
                      fill
                      className="object-cover"
                      unoptimized={unopt(el.image_url)}
                    />
                  ) : (
                    <span className="line-clamp-2 p-1 text-xs font-semibold text-kid-ink">
                      {el.text || el.label || el.kind}
                    </span>
                  )}
                </button>
              );
            })}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <KidButton type="button" variant="secondary" onClick={() => setSlide(activeSlideIndex - 1)} disabled={activeSlideIndex <= 0}>
            Prev slide
          </KidButton>
          <KidButton
            type="button"
            variant="secondary"
            onClick={() => setSlide(activeSlideIndex + 1)}
            disabled={activeSlideIndex >= parsed.slides.length - 1}
          >
            Next slide
          </KidButton>
        </div>
      </KidPanel>
      {popup ? (
        <KidPanel className="mt-4 border-kid-accent bg-kid-accent/10">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-2">
              {popup.title ? <p className="text-lg font-bold text-kid-ink">{popup.title}</p> : null}
              {popup.body ? <p className="text-sm text-kid-ink">{popup.body}</p> : null}
              {popup.image_url ? (
                <div className="relative h-40 w-full max-w-sm overflow-hidden rounded border-2 border-kid-ink">
                  <Image src={popup.image_url} alt="" fill className="object-cover" unoptimized={unopt(popup.image_url)} />
                </div>
              ) : null}
              {popup.video_url ? (
                <video controls src={popup.video_url} className="w-full max-w-sm rounded border-2 border-kid-ink" />
              ) : null}
            </div>
            <KidButton type="button" variant="secondary" onClick={() => setPopup(null)}>
              Close
            </KidButton>
          </div>
        </KidPanel>
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

export function SoundSortView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "sound_sort" }>;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function playSound() {
    playSfx("tap", muted);
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = 0;
    void el.play().catch(() => {
      /* ignore autoplay / CORS */
    });
  }

  function pick(id: string) {
    if (passed) return;
    playSfx("tap", muted);
    if (id === parsed.correct_choice_id) onPass();
    else onWrong();
  }

  return (
    <div>
      <audio ref={audioRef} src={parsed.prompt_audio_url} preload="auto" className="hidden" />
      <KidPanel>
        {parsed.body_text ? (
          <p className="mb-4 text-xl font-semibold text-kid-ink">{parsed.body_text}</p>
        ) : null}
        <div className="mb-6 flex justify-center">
          <KidButton type="button" variant="accent" onClick={playSound}>
            Hear sound
          </KidButton>
        </div>
        <p className="mb-3 text-center text-lg font-bold text-kid-ink">Tap the picture that matches</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {parsed.choices.map((c: (typeof parsed.choices)[number]) => (
            <button
              key={c.id}
              type="button"
              disabled={passed}
              onClick={() => pick(c.id)}
              className={clsx(
                "relative aspect-square overflow-hidden rounded-lg border-4 border-kid-ink bg-kid-panel transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60",
                passed && c.id === parsed.correct_choice_id && "kid-feedback-glow-correct",
              )}
            >
              <Image
                src={c.image_url}
                alt={c.label ?? ""}
                fill
                className="object-cover"
                unoptimized={unopt(c.image_url)}
              />
            </button>
          ))}
        </div>
      </KidPanel>
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

function useAudioRecorder(maxDurationSeconds: number) {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState<number>(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAudio = useCallback(() => {
    setAudioBlob(null);
    setDurationMs(0);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
  }, [audioUrl]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    recorderRef.current?.stop();
  }, []);

  const start = useCallback(async () => {
    setError(null);
    clearAudio();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      startTimeRef.current = Date.now();
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const elapsed = Date.now() - startTimeRef.current;
        setAudioBlob(blob);
        setDurationMs(elapsed);
        setAudioUrl(URL.createObjectURL(blob));
        setRecording(false);
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      setRecording(true);
      timerRef.current = setTimeout(() => stop(), maxDurationSeconds * 1000);
    } catch {
      setError("Microphone access was blocked. Please allow microphone permissions.");
    }
  }, [clearAudio, maxDurationSeconds, stop]);

  useEffect(
    () => () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [audioUrl],
  );

  return { recording, audioBlob, audioUrl, error, durationMs, start, stop, clearAudio };
}

export function ListenHotspotSequenceView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "listen_hotspot_sequence" }>;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [clickedOrder, setClickedOrder] = useState<string[]>([]);

  function playPrompt() {
    playSfx("tap", muted);
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = 0;
    void el.play().catch(() => null);
  }

  function onTargetClick(id: string) {
    if (passed) return;
    playSfx("tap", muted);
    const nextIdx = clickedOrder.length;
    if (parsed.order[nextIdx] === id) {
      const next = [...clickedOrder, id];
      setClickedOrder(next);
      if (next.length === parsed.order.length) onPass();
      return;
    }
    setClickedOrder([]);
    onWrong();
  }

  return (
    <div>
      <audio ref={audioRef} src={parsed.prompt_audio_url} preload="auto" className="hidden" />
      <KidPanel>
        {parsed.body_text ? <p className="mb-4 text-xl font-semibold">{parsed.body_text}</p> : null}
        <div className="mb-4 flex flex-wrap gap-2">
          <KidButton
            type="button"
            variant="accent"
            onClick={playPrompt}
            disabled={!parsed.allow_replay && clickedOrder.length > 0}
          >
            Play prompt audio
          </KidButton>
          {!parsed.allow_replay && clickedOrder.length > 0 ? (
            <p className="text-sm text-neutral-600">Replay disabled by teacher after starting.</p>
          ) : null}
          <p className="text-sm font-semibold text-kid-ink">
            Progress: {clickedOrder.length}/{parsed.order.length}
          </p>
        </div>
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border-4 border-kid-ink">
          <Image src={parsed.image_url} alt="Scene" fill className="object-cover" unoptimized={unopt(parsed.image_url)} />
          {parsed.targets.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={passed}
              className="absolute border-4 border-dashed border-amber-600 bg-amber-200/40 hover:bg-amber-300/50 disabled:opacity-60"
              style={{
                left: `${t.x_percent}%`,
                top: `${t.y_percent}%`,
                width: `${t.w_percent}%`,
                height: `${t.h_percent}%`,
              }}
              onClick={() => onTargetClick(t.id)}
              aria-label={t.label ?? "Target"}
            />
          ))}
        </div>
      </KidPanel>
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

type ListenColorWriteTool =
  | { mode: "color"; id: string }
  | { mode: "text"; id: string };

export function ListenColorWriteView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "listen_color_write" }>;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const textOptions = useMemo(
    () =>
      parsed.shuffle_text_options
        ? deterministicShuffle(parsed.text_options, `${parsed.image_url}:${parsed.targets.length}`)
        : parsed.text_options,
    [parsed.shuffle_text_options, parsed.text_options, parsed.image_url, parsed.targets.length],
  );
  const [activeTool, setActiveTool] = useState<ListenColorWriteTool>(() => ({
    mode: "color",
    id: parsed.palette[0]?.id ?? "",
  }));
  const [answers, setAnswers] = useState<
    Record<string, { mode: "color" | "text"; value: string }>
  >({});

  function playPrompt() {
    if (!parsed.prompt_audio_url) return;
    playSfx("tap", muted);
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = 0;
    void el.play().catch(() => null);
  }

  function applyTarget(targetId: string) {
    if (passed) return;
    if (!activeTool.id) return;
    playSfx("tap", muted);
    setAnswers((prev) => {
      if (!parsed.allow_overwrite && prev[targetId]) return prev;
      return {
        ...prev,
        [targetId]: { mode: activeTool.mode, value: activeTool.id },
      };
    });
  }

  function labelForAnswer(answer?: { mode: "color" | "text"; value: string }) {
    if (!answer) return null;
    if (answer.mode === "color") {
      return parsed.palette.find((p) => p.id === answer.value)?.label ?? answer.value;
    }
    return textOptions.find((t) => t.id === answer.value)?.label ?? answer.value;
  }

  function check() {
    playSfx("tap", muted);
    const required = parsed.require_all_targets ? parsed.targets : parsed.targets.filter((t) => answers[t.id]);
    if (required.length === 0) {
      onWrong();
      return;
    }
    const ok = required.every((target) => {
      const answer = answers[target.id];
      return (
        answer &&
        answer.mode === target.expected_mode &&
        answer.value === target.expected_value
      );
    });
    if (ok) onPass();
    else onWrong();
  }

  const answeredCount = Object.keys(answers).length;

  return (
    <div>
      {parsed.prompt_audio_url ? (
        <audio ref={audioRef} src={parsed.prompt_audio_url} preload="auto" className="hidden" />
      ) : null}
      <KidPanel>
        {parsed.body_text ? (
          <p className="mb-4 text-xl font-semibold">{parsed.body_text}</p>
        ) : null}
        <div className="mb-4 flex flex-wrap gap-2">
          {parsed.prompt_audio_url ? (
            <KidButton type="button" variant="accent" onClick={playPrompt}>
              Play prompt audio
            </KidButton>
          ) : null}
          <p className="text-sm font-semibold text-kid-ink">
            Marked {answeredCount}/{parsed.targets.length}
          </p>
        </div>

        <div className="mb-4 grid gap-3 lg:grid-cols-[260px_1fr]">
          <div className="space-y-3 rounded-lg border-2 border-kid-ink/20 bg-white p-3">
            <p className="text-sm font-bold text-kid-ink">Colors</p>
            <div className="flex flex-wrap gap-2">
              {parsed.palette.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  disabled={passed}
                  onClick={() => setActiveTool({ mode: "color", id: c.id })}
                  className={clsx(
                    "inline-flex items-center gap-2 rounded-full border-2 px-2.5 py-1 text-sm font-semibold",
                    activeTool.mode === "color" && activeTool.id === c.id
                      ? "border-kid-ink bg-kid-panel"
                      : "border-neutral-300 bg-white",
                  )}
                >
                  <span
                    className="inline-block h-4 w-4 rounded-full border border-neutral-500"
                    style={{ backgroundColor: c.color_hex }}
                    aria-hidden
                  />
                  {c.label}
                </button>
              ))}
            </div>
            <p className="text-sm font-bold text-kid-ink">Words</p>
            <div className="flex flex-wrap gap-2">
              {textOptions.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={passed}
                  onClick={() => setActiveTool({ mode: "text", id: t.id })}
                  className={clsx(
                    "rounded-full border-2 px-3 py-1 text-sm font-semibold",
                    activeTool.mode === "text" && activeTool.id === t.id
                      ? "border-kid-ink bg-kid-panel"
                      : "border-neutral-300 bg-white",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative aspect-video w-full overflow-hidden rounded-lg border-4 border-kid-ink">
            <Image
              src={parsed.image_url}
              alt="Scene"
              fill
              className="object-cover"
              unoptimized={unopt(parsed.image_url)}
            />
            {parsed.targets.map((target) => {
              const answer = answers[target.id];
              const isCorrect =
                passed &&
                answer &&
                answer.mode === target.expected_mode &&
                answer.value === target.expected_value;
              const isWrong =
                passed &&
                answer &&
                (answer.mode !== target.expected_mode || answer.value !== target.expected_value);
              const answerLabel = labelForAnswer(answer);
              const fillColor =
                answer?.mode === "color"
                  ? (parsed.palette.find((p) => p.id === answer.value)?.color_hex ?? "#94a3b8")
                  : undefined;
              return (
                <button
                  key={target.id}
                  type="button"
                  disabled={passed || (!parsed.allow_overwrite && !!answer)}
                  className={clsx(
                    "absolute border-4 border-dashed bg-white/10 transition-colors hover:bg-white/20 disabled:opacity-80",
                    isCorrect && "border-kid-success",
                    isWrong && "border-red-700",
                    !isCorrect && !isWrong && "border-kid-accent",
                  )}
                  style={{
                    left: `${target.x_percent}%`,
                    top: `${target.y_percent}%`,
                    width: `${target.w_percent}%`,
                    height: `${target.h_percent}%`,
                    backgroundColor: fillColor ? `${fillColor}66` : undefined,
                  }}
                  onClick={() => applyTarget(target.id)}
                  aria-label={target.label ?? "Target"}
                >
                  {answerLabel ? (
                    <span className="rounded bg-white/85 px-1.5 py-0.5 text-xs font-bold text-neutral-900">
                      {answerLabel}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <KidButton type="button" variant="secondary" disabled={passed} onClick={() => setAnswers({})}>
            Clear
          </KidButton>
          <KidButton type="button" disabled={passed} onClick={check}>
            Check
          </KidButton>
        </div>
      </KidPanel>
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

export function LetterMixupView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "letter_mixup" }>;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps) {
  const item = parsed.items[0];
  const letters = useMemo(() => {
    const raw = item?.target_word ?? "";
    const split = raw.split("");
    return parsed.shuffle_letters ? deterministicShuffle(split, raw) : split;
  }, [item?.target_word, parsed.shuffle_letters]);
  const [selected, setSelected] = useState<string[]>([]);
  const answer = selected.join("");

  function choose(ch: string, idx: number) {
    if (passed) return;
    playSfx("tap", muted);
    setSelected((prev) => [...prev, `${ch}__${idx}`]);
  }

  function clear() {
    playSfx("tap", muted);
    setSelected([]);
  }

  function check() {
    playSfx("tap", muted);
    const built = selected.map((s) => s.split("__")[0]).join("");
    const answers = [item.target_word, ...(item.accepted_words ?? [])];
    const norm = (s: string) =>
      parsed.case_sensitive ? s : s.toLowerCase();
    const ok = answers.some((a) => norm(a) === norm(built));
    if (ok) onPass();
    else onWrong();
  }

  return (
    <div>
      {parsed.image_url ? (
        <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-lg border-4 border-kid-ink">
          <Image src={parsed.image_url} alt="" fill className="object-cover" unoptimized={unopt(parsed.image_url)} />
        </div>
      ) : null}
      <KidPanel>
        <p className="text-xl font-semibold">{parsed.prompt}</p>
        <div className="mt-3 min-h-12 rounded border-2 border-dashed border-kid-ink p-2 text-lg font-bold">
          {answer || "Build the word here"}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {letters.map((ch, i) => {
            const key = `${ch}__${i}`;
            const used = selected.includes(key);
            return (
              <KidButton key={key} type="button" variant="secondary" disabled={passed || used} onClick={() => choose(ch, i)}>
                {ch}
              </KidButton>
            );
          })}
        </div>
        <div className="mt-4 flex gap-2">
          <KidButton type="button" variant="secondary" disabled={passed} onClick={clear}>Clear</KidButton>
          <KidButton type="button" disabled={passed || selected.length === 0} onClick={check}>Check</KidButton>
        </div>
      </KidPanel>
      <GuideBlock guide={parsed.guide} />
      <div className="mt-6 flex flex-wrap gap-3">
        {showBack ? <KidButton type="button" variant="secondary" onClick={onBack}>Back</KidButton> : null}
        <KidButton type="button" disabled={!passed} onClick={() => onNext()}>Next</KidButton>
      </div>
    </div>
  );
}

export function WordShapeHuntView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "word_shape_hunt" }>;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps) {
  const chunks = useMemo(
    () => (parsed.shuffle_chunks ? deterministicShuffle(parsed.word_chunks, parsed.prompt) : parsed.word_chunks),
    [parsed.shuffle_chunks, parsed.word_chunks, parsed.prompt],
  );
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function toggle(id: string) {
    if (passed) return;
    playSfx("tap", muted);
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function check() {
    playSfx("tap", muted);
    const selected = chunks.filter((c) => picked.has(c.id));
    const ok =
      selected.every((c) => c.is_vocab) &&
      chunks.filter((c) => c.is_vocab).every((c) => picked.has(c.id));
    if (ok) onPass();
    else onWrong();
  }
  const layoutClass =
    parsed.shape_layout === "circle"
      ? "rounded-full p-8"
      : parsed.shape_layout === "wave"
        ? "items-end"
        : "";

  return (
    <div>
      {parsed.prompt_audio_url ? <audio ref={audioRef} src={parsed.prompt_audio_url} preload="auto" className="hidden" /> : null}
      <KidPanel>
        <p className="text-xl font-semibold">{parsed.prompt}</p>
        {parsed.prompt_audio_url ? (
          <KidButton type="button" variant="accent" className="mt-3" onClick={() => { const el = audioRef.current; if (!el) return; el.currentTime = 0; void el.play().catch(() => null); }}>
            Play prompt audio
          </KidButton>
        ) : null}
        <div className={clsx("mt-4 flex flex-wrap gap-2", layoutClass)}>
          {chunks.map((c, i) => (
            <button
              key={c.id}
              type="button"
              disabled={passed}
              onClick={() => toggle(c.id)}
              className={clsx(
                "rounded-full border-2 px-3 py-1.5 text-sm font-semibold",
                picked.has(c.id) ? "border-kid-ink bg-kid-accent/50" : "border-neutral-300 bg-white",
                parsed.shape_layout === "wave" && (i % 2 === 0 ? "translate-y-2" : "-translate-y-1"),
              )}
            >
              {c.text}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <KidButton type="button" disabled={passed} onClick={check}>Check</KidButton>
        </div>
      </KidPanel>
      <GuideBlock guide={parsed.guide} />
      <div className="mt-6 flex flex-wrap gap-3">
        {showBack ? <KidButton type="button" variant="secondary" onClick={onBack}>Back</KidButton> : null}
        <KidButton type="button" disabled={!passed} onClick={() => onNext()}>Next</KidButton>
      </div>
    </div>
  );
}

export function TableCompleteView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "table_complete" }>;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps) {
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const ci = parsed.case_insensitive ?? true;
  const nw = parsed.normalize_whitespace ?? true;

  function check() {
    playSfx("tap", muted);
    const ok = parsed.rows.every((r) => {
      if (parsed.input_mode === "typing") {
        const val = typed[r.id] ?? "";
        return (r.accepted_answers ?? []).some((a) => normalizeText(a, ci, nw) === normalizeText(val, ci, nw));
      }
      return placed[r.id] === r.expected_token_id;
    });
    if (ok) onPass();
    else onWrong();
  }

  return (
    <div>
      <KidPanel>
        <p className="text-xl font-semibold">{parsed.prompt}</p>
        {parsed.input_mode === "tokens" && (parsed.token_bank?.length ?? 0) > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {parsed.token_bank!.map((t) => (
              <KidButton key={t.id} type="button" variant={selectedToken === t.id ? "primary" : "secondary"} disabled={passed} onClick={() => setSelectedToken(t.id)}>
                {t.label}
              </KidButton>
            ))}
          </div>
        ) : null}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className="border px-2 py-1">{parsed.left_column_label}</th>
                <th className="border px-2 py-1">{parsed.right_column_label}</th>
              </tr>
            </thead>
            <tbody>
              {parsed.rows.map((r) => (
                <tr key={r.id}>
                  <td className="border px-2 py-1">{r.prompt_text}</td>
                  <td className="border px-2 py-1">
                    {parsed.input_mode === "typing" ? (
                      <input
                        className="w-full rounded border px-2 py-1"
                        value={typed[r.id] ?? ""}
                        disabled={passed}
                        onChange={(e) => setTyped((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      />
                    ) : (
                      <button
                        type="button"
                        className="w-full rounded border-2 border-dashed px-2 py-1 text-left"
                        disabled={passed || !selectedToken}
                        onClick={() => selectedToken && setPlaced((prev) => ({ ...prev, [r.id]: selectedToken }))}
                      >
                        {(parsed.token_bank ?? []).find((t) => t.id === placed[r.id])?.label ?? "Tap to place token"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <KidButton type="button" disabled={passed} onClick={check}>Check</KidButton>
        </div>
      </KidPanel>
      <GuideBlock guide={parsed.guide} />
      <div className="mt-6 flex flex-wrap gap-3">
        {showBack ? <KidButton type="button" variant="secondary" onClick={onBack}>Back</KidButton> : null}
        <KidButton type="button" disabled={!passed} onClick={() => onNext()}>Next</KidButton>
      </div>
    </div>
  );
}

export function SortingGameView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "sorting_game" }>;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps) {
  const objects = useMemo(
    () => (parsed.shuffle_objects ? deterministicShuffle(parsed.objects, parsed.prompt) : parsed.objects),
    [parsed.shuffle_objects, parsed.objects, parsed.prompt],
  );
  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  const [placement, setPlacement] = useState<Record<string, string>>({});
  const [draggingObject, setDraggingObject] = useState<string | null>(null);
  const [lockedCorrectIds, setLockedCorrectIds] = useState<Set<string>>(new Set());
  const [wrongIds, setWrongIds] = useState<Set<string>>(new Set());
  const wrongTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (wrongTimerRef.current) clearTimeout(wrongTimerRef.current);
    };
  }, []);

  function place(containerId: string) {
    if (passed || !selectedObject || lockedCorrectIds.has(selectedObject)) return;
    playSfx("tap", muted);
    if (wrongIds.has(selectedObject)) {
      setWrongIds((prev) => {
        const next = new Set(prev);
        next.delete(selectedObject);
        return next;
      });
    }
    setPlacement((prev) => ({ ...prev, [selectedObject]: containerId }));
    if (!parsed.allow_reassign) setSelectedObject(null);
  }

  function check() {
    playSfx("tap", muted);
    const correctNow = objects
      .filter((o) => placement[o.id] === o.target_container_id)
      .map((o) => o.id);
    const wrongNow = objects
      .filter((o) => placement[o.id] && placement[o.id] !== o.target_container_id)
      .map((o) => o.id);

    const nextLocked = new Set(lockedCorrectIds);
    for (const id of correctNow) nextLocked.add(id);
    setLockedCorrectIds(nextLocked);
    const allLocked = objects.every((o) => nextLocked.has(o.id));

    setLockedCorrectIds(nextLocked);
    if (allLocked) onPass();
    else onWrong();

    setWrongIds(new Set(wrongNow));
    if (wrongTimerRef.current) clearTimeout(wrongTimerRef.current);
    if (wrongNow.length > 0) {
      wrongTimerRef.current = setTimeout(() => {
        setPlacement((prev) => {
          const next = { ...prev };
          for (const id of wrongNow) delete next[id];
          return next;
        });
        setWrongIds(new Set());
      }, 520);
    }
  }

  const placedIds = new Set(Object.keys(placement));
  const showObjectText = (o: (typeof objects)[number]) =>
    (o.display.show_text ?? true) && !!o.display.text?.trim();
  const showObjectImage = (o: (typeof objects)[number]) =>
    (o.display.show_image ?? true) && !!o.display.image_url?.trim();
  const showContainerText = (c: (typeof parsed.containers)[number]) =>
    (c.display.show_text ?? true) && !!c.display.text?.trim();
  const showContainerImage = (c: (typeof parsed.containers)[number]) =>
    (c.display.show_image ?? true) && !!c.display.image_url?.trim();

  return (
    <div>
      <KidPanel>
        <p className="text-xl font-semibold">{parsed.prompt}</p>
        <p className="mt-2 text-sm text-neutral-700">Tap an object, then tap a container. Drag-and-drop also works.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {objects.map((o) => (
            <button
              key={o.id}
              type="button"
              draggable={!passed}
              onDragStart={() => setDraggingObject(o.id)}
              onDragEnd={() => setDraggingObject(null)}
              onClick={() => {
                if (lockedCorrectIds.has(o.id)) return;
                setSelectedObject(o.id);
              }}
              disabled={passed || lockedCorrectIds.has(o.id)}
              className={clsx(
                "rounded border-2 px-3 py-2 text-sm font-semibold transition-all",
                selectedObject === o.id ? "border-kid-ink bg-kid-accent/40" : "border-neutral-300 bg-white",
                placedIds.has(o.id) && "opacity-70",
                lockedCorrectIds.has(o.id) &&
                  "border-emerald-700 bg-emerald-100 text-emerald-900 opacity-100 kid-feedback-glow-correct",
                wrongIds.has(o.id) && "border-red-600 bg-red-100 text-red-900 kid-animate-shake",
              )}
            >
              {showObjectImage(o) ? (
                <Image
                  src={o.display.image_url!}
                  alt=""
                  width={28}
                  height={28}
                  className={clsx(
                    "mr-1 inline-block rounded",
                    (o.display.image_fit ?? "contain") === "cover" ? "object-cover" : "object-contain",
                  )}
                  unoptimized={unopt(o.display.image_url!)}
                />
              ) : null}
              {showObjectText(o) ? (o.display.text ?? o.id) : null}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {parsed.containers.map((c) => {
            const inContainer = objects.filter((o) => placement[o.id] === c.id);
            return (
              <button
                key={c.id}
                type="button"
                className="min-h-28 rounded-lg border-2 border-dashed border-kid-ink/60 bg-white p-2 text-left"
                onClick={() => place(c.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const dragged = draggingObject || e.dataTransfer.getData("text/plain");
                  if (!dragged) return;
                  if (passed) return;
                  if (lockedCorrectIds.has(dragged)) return;
                  setPlacement((prev) => ({ ...prev, [dragged]: c.id }));
                }}
              >
                {showContainerText(c) ? (
                  <p className="font-semibold">{c.display.text ?? c.id}</p>
                ) : null}
                {showContainerImage(c) ? (
                  <Image
                    src={c.display.image_url!}
                    alt=""
                    width={42}
                    height={42}
                    className={clsx(
                      "mt-1 rounded",
                      (c.display.image_fit ?? "contain") === "cover" ? "object-cover" : "object-contain",
                    )}
                    unoptimized={unopt(c.display.image_url!)}
                  />
                ) : null}
                <div className="mt-2 flex flex-wrap gap-1">
                  {inContainer.map((o) => (
                    <span
                      key={o.id}
                      className={clsx(
                        "rounded px-2 py-0.5 text-xs font-semibold transition-all",
                        lockedCorrectIds.has(o.id) && "bg-emerald-100 text-emerald-800",
                        wrongIds.has(o.id) && "bg-red-100 text-red-800 kid-animate-shake",
                        !lockedCorrectIds.has(o.id) &&
                          !wrongIds.has(o.id) &&
                          "bg-kid-panel text-kid-ink",
                      )}
                    >
                      {(o.display.show_text ?? true) ? (o.display.text ?? o.id) : o.id}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-4">
          <KidButton type="button" disabled={passed} onClick={check}>Check</KidButton>
        </div>
      </KidPanel>
      <GuideBlock guide={parsed.guide} />
      <div className="mt-6 flex flex-wrap gap-3">
        {showBack ? <KidButton type="button" variant="secondary" onClick={onBack}>Back</KidButton> : null}
        <KidButton type="button" disabled={!passed} onClick={() => onNext()}>Next</KidButton>
      </div>
    </div>
  );
}

type VoiceSubmitResult = { uploaded: boolean; submissionId: string | null; error: string | null };

async function uploadVoiceAnswer(args: {
  blob: Blob;
  lessonId: string;
  screenId: string;
  subtype: "voice_question" | "guided_dialogue";
  turnId?: string;
  turnIndex?: number;
  durationMs?: number;
}): Promise<VoiceSubmitResult> {
  try {
    const sessionId = getProgressSnapshot().anonymousDeviceId;
    const ext = args.blob.type.includes("ogg") ? "ogg" : "webm";
    const file = new File([args.blob], `voice.${ext}`, { type: args.blob.type || "audio/webm" });
    const formData = new FormData();
    formData.set("lesson_id", args.lessonId);
    formData.set("screen_id", args.screenId);
    formData.set("activity_subtype", args.subtype);
    formData.set("student_session_id", sessionId);
    formData.set("audio", file);
    if (args.turnId) formData.set("turn_id", args.turnId);
    if (args.turnIndex != null) formData.set("turn_index", String(args.turnIndex));
    if (args.durationMs != null) formData.set("duration_ms", String(args.durationMs));
    const result = await uploadStudentVoiceSubmission(formData);
    return { uploaded: true, submissionId: result.id, error: null };
  } catch (e) {
    return { uploaded: false, submissionId: null, error: e instanceof Error ? e.message : "Upload failed." };
  }
}

export function VoiceQuestionView({
  parsed,
  screenId,
  lessonId,
  muted,
  passed,
  onPass,
  onWrong: _onWrong,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "voice_question" }>;
  screenId: string;
  lessonId: string;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps & { screenId: string; lessonId: string }) {
  const recorder = useAudioRecorder(parsed.max_duration_seconds ?? 90);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [playedBack, setPlayedBack] = useState(false);
  const maxAttempts = parsed.max_attempts ?? 3;

  async function submit() {
    if (!recorder.audioBlob || passed) return;
    playSfx("tap", muted);
    setUploading(true);
    setSubmitError(null);
    const result = await uploadVoiceAnswer({
      blob: recorder.audioBlob,
      lessonId,
      screenId,
      subtype: "voice_question",
      durationMs: recorder.durationMs,
    });
    setUploading(false);
    if (!result.uploaded) {
      setSubmitError(result.error);
      return;
    }
    onPass();
  }

  return (
    <div>
      {parsed.image_url ? (
        <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-lg border-4 border-kid-ink">
          <Image src={parsed.image_url} alt="" fill className="object-cover" unoptimized={unopt(parsed.image_url)} />
        </div>
      ) : null}
      <KidPanel>
        <p className="text-xl font-semibold">{parsed.prompt}</p>
        {parsed.prompt_audio_url ? (
          <audio className="mt-3 w-full" controls src={parsed.prompt_audio_url} />
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <KidButton
            type="button"
            variant="secondary"
            onClick={() => {
              if (attemptsUsed >= maxAttempts) return;
              setAttemptsUsed((v) => v + 1);
              void recorder.start();
            }}
            disabled={recorder.recording || attemptsUsed >= maxAttempts || passed}
          >
            Record
          </KidButton>
          <KidButton type="button" variant="secondary" onClick={recorder.stop} disabled={!recorder.recording || passed}>
            Stop
          </KidButton>
          <span className="text-sm text-neutral-600">Attempts: {attemptsUsed}/{maxAttempts}</span>
        </div>
        {recorder.audioUrl ? (
          <div className="mt-3 space-y-2">
            <audio controls src={recorder.audioUrl} onPlay={() => setPlayedBack(true)} className="w-full" />
            <KidButton type="button" onClick={() => void submit()} disabled={uploading || passed || (parsed.require_playback_before_submit && !playedBack)}>
              {uploading ? "Uploading..." : "Submit recording"}
            </KidButton>
          </div>
        ) : null}
        {recorder.recording ? <p className="mt-2 text-sm text-amber-800">Recording in progress...</p> : null}
        {recorder.error || submitError ? (
          <p className="mt-2 text-sm text-red-700">{submitError ?? recorder.error}</p>
        ) : null}
      </KidPanel>
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

export function GuidedDialogueView({
  parsed,
  lessonId,
  screenId,
  muted,
  passed,
  onPass,
  onWrong: _onWrong,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "guided_dialogue" }>;
  lessonId: string;
  screenId: string;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps & { lessonId: string; screenId: string }) {
  const [turnIndex, setTurnIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [playedPrompt, setPlayedPrompt] = useState(false);
  const turn = parsed.turns[turnIndex];
  const recorder = useAudioRecorder(turn?.max_duration_seconds ?? 90);
  const promptAudioRef = useRef<HTMLAudioElement | null>(null);

  async function submitTurn() {
    if (!turn || !recorder.audioBlob) return;
    setUploading(true);
    setSubmitError(null);
    const result = await uploadVoiceAnswer({
      blob: recorder.audioBlob,
      lessonId,
      screenId,
      subtype: "guided_dialogue",
      turnId: turn.id,
      turnIndex,
      durationMs: recorder.durationMs,
    });
    setUploading(false);
    if (!result.uploaded) {
      setSubmitError(result.error);
      return;
    }
    if (turnIndex >= parsed.turns.length - 1) {
      onPass();
      return;
    }
    setTurnIndex((v) => v + 1);
    recorder.clearAudio();
    setPlayedPrompt(false);
  }

  return (
    <div>
      <KidPanel>
        <div className="mb-4 flex items-center gap-3">
          <div className="relative h-20 w-20 overflow-hidden rounded-lg border-2 border-kid-ink">
            <Image src={parsed.character_image_url} alt={parsed.character_name} fill className="object-cover" unoptimized={unopt(parsed.character_image_url)} />
          </div>
          <div>
            <p className="text-xl font-bold">{parsed.character_name}</p>
            <p className="text-sm text-neutral-600">Turn {turnIndex + 1} of {parsed.turns.length}</p>
          </div>
        </div>
        {parsed.intro_text ? <p className="mb-2 text-sm text-neutral-700">{parsed.intro_text}</p> : null}
        <p className="text-lg font-semibold">{turn.prompt_text}</p>
        {turn.prompt_audio_url ? (
          <div className="mt-3">
            <audio ref={promptAudioRef} controls src={turn.prompt_audio_url} onPlay={() => setPlayedPrompt(true)} className="w-full" />
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <KidButton
            type="button"
            variant="secondary"
            onClick={() => void recorder.start()}
            disabled={recorder.recording || (parsed.require_turn_audio_playback && turn.prompt_audio_url != null && !playedPrompt)}
          >
            Record response
          </KidButton>
          <KidButton type="button" variant="secondary" onClick={recorder.stop} disabled={!recorder.recording}>
            Stop
          </KidButton>
        </div>
        {recorder.audioUrl ? (
          <div className="mt-3 space-y-2">
            <audio controls src={recorder.audioUrl} className="w-full" />
            <KidButton type="button" onClick={() => void submitTurn()} disabled={uploading || passed}>
              {uploading ? "Uploading..." : turnIndex >= parsed.turns.length - 1 ? "Submit final turn" : "Submit and continue"}
            </KidButton>
          </div>
        ) : null}
        {submitError || recorder.error ? <p className="mt-2 text-sm text-red-700">{submitError ?? recorder.error}</p> : null}
      </KidPanel>
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

export function DragSentenceView({
  parsed,
  muted,
  filled,
  setFilled,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "drag_sentence" }>;
  muted: boolean;
  filled: string[];
  setFilled: (v: string[]) => void;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps) {
  const slots = parsed.sentence_slots.length;
  const bank = parsed.word_bank.filter((w: string) => !filled.includes(w));

  function addWord(w: string) {
    if (passed) return;
    playSfx("tap", muted);
    if (filled.length >= slots) return;
    setFilled([...filled, w]);
  }

  function clearSlot(i: number) {
    if (passed) return;
    playSfx("tap", muted);
    setFilled(filled.filter((_, idx) => idx !== i));
  }

  function check() {
    playSfx("tap", muted);
    if (filled.length !== parsed.correct_order.length) {
      onWrong();
      return;
    }
    const ok = filled.every((w: string, i: number) => w === parsed.correct_order[i]);
    if (ok) onPass();
    else onWrong();
  }

  return (
    <div>
      <KidPanel>
        {parsed.body_text ? (
          <p className="mb-4 text-lg">{parsed.body_text}</p>
        ) : null}
        <p className="mb-2 font-semibold">Fill the sentence:</p>
        <div className="flex min-h-14 flex-wrap gap-2 rounded-lg border-4 border-kid-ink p-3">
          {Array.from({ length: slots }).map((_, i) => (
            <button
              key={i}
              type="button"
              disabled={passed}
              onClick={() => clearSlot(i)}
              className="min-w-[5rem] rounded-md border-2 border-neutral-800 bg-neutral-100 px-2 py-2 text-center font-semibold hover:bg-neutral-200 active:bg-neutral-300"
            >
              {filled[i] ?? "—"}
            </button>
          ))}
        </div>
        <p className="mt-4 mb-2 font-semibold">Words</p>
        <div className="flex flex-wrap gap-2">
          {bank.map((w: string) => (
            <KidButton
              key={w}
              type="button"
              variant="secondary"
              className="!min-h-10 !min-w-0 text-base"
              disabled={passed}
              onClick={() => addWord(w)}
            >
              {w}
            </KidButton>
          ))}
        </div>
        <div className="mt-4">
          <KidButton
            type="button"
            variant="secondary"
            disabled={passed || filled.length === 0}
            onClick={() => setFilled([])}
          >
            Clear
          </KidButton>
          <KidButton
            type="button"
            className="ml-3"
            disabled={passed}
            onClick={check}
          >
            Check
          </KidButton>
        </div>
      </KidPanel>
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
