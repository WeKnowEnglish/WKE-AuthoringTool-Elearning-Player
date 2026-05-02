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
import { GuideBlock, interactionImageFitClass, NavProps, unopt, normalizeText } from "./shared";

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
  const [wrongChoice, setWrongChoice] = useState<"true" | "false" | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const wrongFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      setWrongChoice(null);
      setIsResolving(false);
    });
    if (wrongFlashTimerRef.current) {
      clearTimeout(wrongFlashTimerRef.current);
      wrongFlashTimerRef.current = null;
    }
  }, [parsed.statement, parsed.correct, parsed.image_url, parsed.image_fit]);

  const wrongButtonClass = (which: "true" | "false") =>
    clsx(
      "min-w-[8rem]",
      wrongChoice === which && "border-red-600 bg-red-100 text-red-900 kid-animate-shake",
    );

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
        <p className="text-xl font-semibold">{parsed.statement}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <KidButton
            type="button"
            variant="secondary"
            disabled={passed || isResolving}
            className={wrongButtonClass("true")}
            onClick={async () => {
              if (passed || isResolving) return;
              playSfx("tap", muted);
              if (parsed.correct) {
                setIsResolving(true);
                await speakTextAndWait("True", { muted });
                onPass();
                setIsResolving(false);
                return;
              }
              setWrongChoice("true");
              triggerBuzz();
              onWrong();
              if (wrongFlashTimerRef.current) {
                clearTimeout(wrongFlashTimerRef.current);
              }
              wrongFlashTimerRef.current = setTimeout(() => {
                setWrongChoice((current) => (current === "true" ? null : current));
              }, 460);
            }}
          >
            True
          </KidButton>
          <KidButton
            type="button"
            variant="secondary"
            disabled={passed || isResolving}
            className={wrongButtonClass("false")}
            onClick={async () => {
              if (passed || isResolving) return;
              playSfx("tap", muted);
              if (!parsed.correct) {
                setIsResolving(true);
                await speakTextAndWait("False", { muted });
                onPass();
                setIsResolving(false);
                return;
              }
              setWrongChoice("false");
              triggerBuzz();
              onWrong();
              if (wrongFlashTimerRef.current) {
                clearTimeout(wrongFlashTimerRef.current);
              }
              wrongFlashTimerRef.current = setTimeout(() => {
                setWrongChoice((current) => (current === "false" ? null : current));
              }, 460);
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
