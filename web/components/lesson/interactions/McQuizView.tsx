"use client";

import Image from "next/image";
import { clsx } from "clsx";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import { speakText, speakTextAndWait } from "@/lib/audio/tts";
import type { ScreenPayload } from "@/lib/lesson-schemas";
import { GuideBlock, NavProps, unopt, deterministicShuffle } from "./shared";

const lastMcQuizOrderBySignature = new Map<string, string>();

function orderSignature(options: { id: string }[]): string {
  return options.map((o) => o.id).join("|");
}

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
  const [wrongOptionId, setWrongOptionId] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const wrongFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [shuffleSeed, setShuffleSeed] = useState("initial");

  const triggerBuzz = useCallback(() => {
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
    navigator.vibrate([80, 50, 100]);
  }, []);

  useEffect(() => {
    return () => {
      if (wrongFlashTimerRef.current) {
        clearTimeout(wrongFlashTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setWrongOptionId(null);
      setIsResolving(false);
    });
    if (wrongFlashTimerRef.current) {
      clearTimeout(wrongFlashTimerRef.current);
      wrongFlashTimerRef.current = null;
    }
  }, [parsed.question, optionsSignature, parsed.correct_option_id]);

  useEffect(() => {
    const buf = new Uint32Array(2);
    crypto.getRandomValues(buf);
    queueMicrotask(() => {
      setShuffleSeed(`${buf[0].toString(36)}-${buf[1].toString(36)}`);
    });
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
              disabled={passed || isResolving}
              className={clsx(
                "w-full text-left",
                wrongOptionId === opt.id && "border-red-600 bg-red-100 text-red-900 kid-animate-shake",
              )}
              onClick={async () => {
                if (passed || isResolving) return;
                playSfx("tap", muted);
                if (opt.id === parsed.correct_option_id) {
                  setIsResolving(true);
                  await speakTextAndWait(opt.label, { muted });
                  onPass();
                  setIsResolving(false);
                  return;
                }
                setWrongOptionId(opt.id);
                triggerBuzz();
                onWrong();
                if (wrongFlashTimerRef.current) {
                  clearTimeout(wrongFlashTimerRef.current);
                }
                wrongFlashTimerRef.current = setTimeout(() => {
                  setWrongOptionId((current) => (current === opt.id ? null : current));
                }, 460);
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
