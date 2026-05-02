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
            className={interactionImageFitClass(parsed.image_fit)}
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
