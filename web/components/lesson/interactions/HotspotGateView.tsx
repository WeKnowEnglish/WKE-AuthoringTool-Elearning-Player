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
import { GuideBlock, NavProps, unopt } from "./shared";

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
