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
import { GuideBlock, interactionImageFitClass, NavProps, unopt } from "./shared";

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
            className={interactionImageFitClass(parsed.image_fit)}
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
