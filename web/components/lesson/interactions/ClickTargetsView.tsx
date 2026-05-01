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
