"use client";

import { useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import type { SecondaryVocabItem } from "@/lib/secondary/types";

type Props = {
  item: SecondaryVocabItem;
};

export function SecondaryWordMeaningCard({ item }: Props) {
  const [showVietnamese, setShowVietnamese] = useState(false);
  const hasVietnamese = Boolean(item.vnMeaning?.trim());

  return (
    <section className="rounded-xl border-2 border-kid-ink/20 bg-kid-panel/40 p-4">
      <h3 className="text-sm font-extrabold text-kid-ink">What does it mean?</h3>
      <p className="mt-2 text-sm font-semibold leading-relaxed text-kid-ink/90">
        {item.studentMeaningEn}
      </p>
      {hasVietnamese ? (
        <div className="mt-3">
          <KidButton
            type="button"
            variant="secondary"
            className="!min-h-8 text-xs"
            aria-expanded={showVietnamese}
            onClick={() => setShowVietnamese((open) => !open)}
          >
            {showVietnamese ? "Hide Vietnamese" : "Show Vietnamese"}
          </KidButton>
          {showVietnamese ? (
            <p className="mt-2 text-sm font-semibold text-kid-ink/80">{item.vnMeaning}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
