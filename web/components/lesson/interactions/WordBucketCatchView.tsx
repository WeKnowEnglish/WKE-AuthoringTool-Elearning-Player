"use client";

import Image from "next/image";
import { useMemo } from "react";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import {
  GuideBlock,
  InteractionLessonNav,
  interactionNavReservePaddingClass,
  interactionImageFitClass,
  type NavProps,
  unopt,
} from "@/components/lesson/interactions/shared";
import { WordBucketCatchCore } from "@/components/lesson/interactions/WordBucketCatchCore";
import type { ScreenPayload } from "@/lib/lesson-schemas";
import { wordBucketCatchConfigFromPayload } from "@/lib/lesson/word-bucket-catch";

export function WordBucketCatchView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "word_bucket_catch" }>;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps) {
  const cfg = useMemo(() => wordBucketCatchConfigFromPayload(parsed), [parsed]);
  const subline = parsed.body_text?.trim() || undefined;

  return (
    <div className={interactionNavReservePaddingClass}>
      <KidPanel>
        {parsed.image_url ? (
          <div
            className="relative mx-auto mb-3 w-full max-w-xl overflow-hidden rounded-xl border-2 border-kid-ink"
            style={{ aspectRatio: "16 / 9" }}
          >
            <Image
              src={parsed.image_url}
              alt=""
              fill
              className={interactionImageFitClass(parsed.image_fit)}
              sizes="(max-width: 768px) 100vw, 640px"
              unoptimized={unopt(parsed.image_url)}
            />
          </div>
        ) : null}
        {passed ? (
          <p className="mb-2 text-center text-lg font-bold text-emerald-800">Nice work — you caught them all.</p>
        ) : null}
        <WordBucketCatchCore
          config={cfg}
          muted={muted}
          locked={passed}
          instructionalSubline={subline}
          onRoundWin={onPass}
          onRoundLose={onWrong}
        />
      </KidPanel>
      <GuideBlock guide={parsed.guide} />
      <InteractionLessonNav showBack={showBack} onBack={onBack} passed={passed} onNext={onNext} />
    </div>
  );
}
