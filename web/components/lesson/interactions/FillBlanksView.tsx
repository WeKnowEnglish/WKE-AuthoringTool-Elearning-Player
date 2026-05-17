"use client";

import Image from "next/image";
import { clsx } from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx, primeAudioOutput } from "@/lib/audio/sfx";
import { speakText, speakTextAndWait } from "@/lib/audio/tts";
import type { ScreenPayload } from "@/lib/lesson-schemas";
import { fillVocabClozeTemplate } from "@/lib/vocabulary-templates/vocab-cloze";
import {
  VOCAB_STAGE_BACKGROUND,
  vocabWordChipButtonLargeClass,
} from "@/lib/vocabulary-templates/vocab-interaction-ui";
import {
  GuideBlock,
  interactionImageFitClass,
  interactionHeroImageFrameStyle,
  interactionImmersiveStageClass,
  InteractionLessonNav,
  InteractionStageFooter,
  interactionNavReservePaddingClass,
  NavProps,
  unopt,
} from "./shared";

export function FillBlanksView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
  controlsPlacement,
  vocabStageTint = false,
  ttsLang = "en-US",
  submitOnEnter,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "fill_blanks" }>;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
  vocabStageTint?: boolean;
  ttsLang?: string;
  submitOnEnter?: boolean;
} & NavProps) {
  const immersive = controlsPlacement === "stage-footer";
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      parsed.blanks.map((b: { id: string }): [string, string] => [b.id, ""]),
    ),
  );
  const [lockedCorrectIds, setLockedCorrectIds] = useState<Set<string>>(() => new Set());
  const [wrongHint, setWrongHint] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const blanksSignature = useMemo(
    () =>
      parsed.blanks
        .map((b) => `${b.id}:${b.acceptable.map((a) => a.trim().toLowerCase()).join("|")}`)
        .join("||"),
    [parsed.blanks],
  );
  const wordBankSignature = useMemo(() => (parsed.word_bank ?? []).join("|"), [parsed.word_bank]);

  useEffect(() => {
    queueMicrotask(() => {
      setAnswers(
        Object.fromEntries(parsed.blanks.map((b: { id: string }): [string, string] => [b.id, ""])),
      );
      setLockedCorrectIds(new Set());
      setWrongHint(null);
      setChecking(false);
    });
  }, [parsed.template, blanksSignature, wordBankSignature]);

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

  const pictureListenLine = parsed.image_read_aloud_text?.trim() ?? "";

  useEffect(() => {
    if (!immersive || muted || passed || !parsed.image_use_tts || !pictureListenLine) return;
    const timer = window.setTimeout(() => {
      speakText(pictureListenLine, { lang: ttsLang, muted });
    }, 320);
    return () => window.clearTimeout(timer);
  }, [
    immersive,
    muted,
    passed,
    parsed.image_use_tts,
    pictureListenLine,
    parsed.image_url,
    ttsLang,
  ]);

  const pickTargetBlankId = useCallback((): string | null => {
    if (passed) return null;
    let firstEditable: string | null = null;
    for (const p of parts) {
      if (p.type !== "blank") continue;
      const id = p.value;
      if (lockedCorrectIds.has(id)) continue;
      if (firstEditable === null) firstEditable = id;
      if (!(answers[id] ?? "").trim()) return id;
    }
    return firstEditable;
  }, [parts, answers, lockedCorrectIds, passed]);

  const applyWordFromBank = useCallback(
    (word: string) => {
      if (passed) return;
      const id = pickTargetBlankId();
      if (!id) return;
      playSfx("tap", muted);
      setWrongHint(null);
      setAnswers((prev) => ({ ...prev, [id]: word }));
    },
    [passed, muted, pickTargetBlankId],
  );

  const playPictureWord = useCallback(() => {
    if (passed || !pictureListenLine || muted) return;
    primeAudioOutput();
    playSfx("tap", muted);
    speakText(pictureListenLine, { lang: ttsLang, muted });
  }, [passed, pictureListenLine, muted, ttsLang]);

  const filledSentenceForPass = useCallback((): string | null => {
    const blank = parsed.blanks[0];
    if (!blank) return null;
    const raw = (answers[blank.id] ?? "").trim();
    if (!raw) return null;
    const norm = raw.toLowerCase().replace(/\s+/g, " ");
    const match = blank.acceptable.find(
      (a: string) => a.trim().toLowerCase().replace(/\s+/g, " ") === norm,
    );
    if (!match) return null;
    return fillVocabClozeTemplate(parsed.template, blank.id, match);
  }, [answers, parsed.blanks, parsed.template]);

  const check = useCallback(async () => {
    if (passed || checking) return;
    playSfx("tap", muted);
    setChecking(true);
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
      setWrongHint(
        parsed.word_bank?.length
          ? immersive
            ? "Not quite yet. Correct words stay green. Tap a word or type, then Check."
            : "Not quite yet. Correct words stay green. Use the word box or type, then tap Check."
          : "Not quite yet. Correct words are locked in green. Try again for the empty blanks.",
      );
      onWrong();
      setChecking(false);
      return;
    }
    setWrongHint(null);
    const filled = immersive && vocabStageTint ? filledSentenceForPass() : null;
    if (filled && !muted) {
      await speakTextAndWait(filled, { lang: ttsLang, muted });
    }
    onPass();
    setChecking(false);
  }, [
    answers,
    checking,
    filledSentenceForPass,
    immersive,
    lockedCorrectIds,
    muted,
    onPass,
    onWrong,
    parsed.blanks,
    parsed.word_bank?.length,
    ttsLang,
    vocabStageTint,
  ]);

  const blankInputClass = (blankId: string) =>
    clsx(
      "mx-1 inline-block rounded-lg border-2 align-baseline text-center font-bold",
      immersive ?
        "min-w-[7.5rem] px-3 py-1.5 text-xl sm:min-w-[8.5rem] sm:text-2xl"
      : "min-w-[5.5rem] px-2 py-1 text-lg",
      lockedCorrectIds.has(blankId)
        ? "border-emerald-700 bg-emerald-50 text-emerald-900"
        : immersive
          ? "border-[#152668] bg-white text-[#0f172a] shadow-[1px_1px_0_#152668]"
          : "border-neutral-800 bg-white",
    );

  const sentenceBlock = (
    <p
      className={clsx(
        "leading-relaxed text-kid-ink",
        immersive ?
          "text-center text-3xl font-bold leading-snug sm:text-4xl md:text-[2.75rem]"
        : "mb-2 text-xl",
      )}
    >
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
            onKeyDown={(e) => {
              if (!submitOnEnter || passed) return;
              if (e.key !== "Enter") return;
              e.preventDefault();
              void check();
            }}
            className={blankInputClass(p.value)}
            aria-label={`Blank ${p.value}`}
          />
        ),
      )}
    </p>
  );

  const wordBankBlock =
    parsed.word_bank && parsed.word_bank.length > 0 ?
      immersive ?
        <div
          className="flex flex-wrap justify-center gap-3"
          role="group"
          aria-label="Word choices"
        >
          {parsed.word_bank.map((w, i) => (
            <button
              key={`${w}-${i}`}
              type="button"
              disabled={passed || pickTargetBlankId() === null}
              className={vocabWordChipButtonLargeClass}
              onClick={() => applyWordFromBank(w)}
            >
              {w}
            </button>
          ))}
        </div>
      : <div
          className="mt-4 rounded-xl border-2 border-kid-ink/25 bg-kid-surface-muted/40 px-3 py-3"
          role="group"
          aria-label="Word choices"
        >
          <p className="mb-1 font-semibold text-kid-ink">Word box</p>
          <p className="mb-3 text-sm text-neutral-700">
            Tap a word to fill the blank. You can still type instead.
          </p>
          <div className="flex flex-wrap gap-2">
            {parsed.word_bank.map((w, i) => (
              <KidButton
                key={`${w}-${i}`}
                type="button"
                variant="secondary"
                disabled={passed || pickTargetBlankId() === null}
                className="!min-h-11 !min-w-[3.25rem] px-3 py-2 text-base font-bold"
                onClick={() => applyWordFromBank(w)}
              >
                {w}
              </KidButton>
            ))}
          </div>
        </div>
    : null;

  const wrongHintBlock =
    wrongHint ?
      <p
        className={clsx(
          "rounded-lg border-2 border-red-300 bg-red-50 px-3 py-2 text-base font-semibold text-red-900",
          immersive ? "mt-3 text-center" : "mt-3",
        )}
      >
        {wrongHint}
      </p>
    : null;

  const checkButton = (
    <KidButton
      type="button"
      disabled={passed || checking}
      onClick={() => void check()}
      className={immersive ? "!min-h-12 !px-6 !text-lg sm:!text-xl" : undefined}
    >
      Check
    </KidButton>
  );

  if (immersive) {
    return (
      <div
        className={clsx(
          interactionImmersiveStageClass,
          vocabStageTint && "rounded-lg px-2 py-2 sm:px-3",
        )}
        style={vocabStageTint ? { backgroundColor: VOCAB_STAGE_BACKGROUND } : undefined}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          {parsed.image_url ? (
            <button
              type="button"
              disabled={passed}
              onClick={playPictureWord}
              className={clsx(
                "relative mx-auto w-full max-w-md shrink-0 overflow-hidden rounded-lg border-4 border-kid-ink outline-none ring-kid-ink focus-visible:ring-4",
                !passed && parsed.image_use_tts && pictureListenLine && "cursor-pointer",
              )}
              style={{
                aspectRatio: "16 / 10",
                maxHeight: "min(32dvh, calc((100vw - 3rem) * 10 / 16))",
              }}
              aria-label={
                parsed.image_use_tts && pictureListenLine
                  ? `Tap to hear: ${pictureListenLine}`
                  : "Picture"
              }
            >
              <Image
                src={parsed.image_url}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 28rem"
                className={interactionImageFitClass(parsed.image_fit)}
                unoptimized={unopt(parsed.image_url)}
              />
              {!passed && parsed.image_use_tts && pictureListenLine ? (
                <span className="pointer-events-none absolute bottom-2 left-2 rounded-full border-2 border-kid-ink bg-white/95 px-2.5 py-1 text-xs font-bold text-kid-ink shadow-sm">
                  Tap · hear word
                </span>
              ) : null}
            </button>
          ) : null}
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-1">
            {sentenceBlock}
            {wordBankBlock}
            {wrongHintBlock}
            <div>{checkButton}</div>
          </div>
        </div>
        <InteractionStageFooter showBack={showBack} onBack={onBack} passed={passed} onNext={onNext} />
      </div>
    );
  }

  const imageSizeClass = parsed.image_size === "small" ? "max-w-xl" : "max-w-4xl";

  return (
    <div className={interactionNavReservePaddingClass}>
      {parsed.image_url ? (
        <div
          className={clsx(
            "relative mb-3 w-full overflow-hidden rounded-lg border-4 border-kid-ink",
            imageSizeClass,
          )}
          style={interactionHeroImageFrameStyle}
        >
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
        {parsed.body_text ? <p className="mb-4 text-lg">{parsed.body_text}</p> : null}
        {sentenceBlock}
        {wordBankBlock}
        {wrongHintBlock}
        <div className="mt-4">{checkButton}</div>
      </KidPanel>
      <GuideBlock guide={parsed.guide} />
      <InteractionLessonNav showBack={showBack} onBack={onBack} passed={passed} onNext={onNext} />
    </div>
  );
}
