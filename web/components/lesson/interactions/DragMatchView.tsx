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
