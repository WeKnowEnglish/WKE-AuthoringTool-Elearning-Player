"use client";

import Image from "next/image";
import { clsx } from "clsx";
import { useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import type { ScreenPayload } from "@/lib/lesson-schemas";
import {
  GuideBlock,
  gamesBodyTextClass,
  gamesCheckActionRowClass,
  gamesChipButtonClass,
  gamesHeroImageFrameClass,
  gamesHintTextClass,
  gamesMatchZoneClass,
  gamesWrongHintClass,
  interactionHeroImageHeightStyle,
  interactionImageFitClass,
  InteractionLessonNav,
  interactionNavReservePaddingClass,
  NavProps,
  unopt,
} from "./shared";

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
  const [wrongHint, setWrongHint] = useState<string | null>(null);

  const zones = parsed.zones;
  const tokens = parsed.tokens;

  function selectToken(id: string) {
    if (passed) return;
    playSfx("tap", muted);
    setWrongHint(null);
    setSelectedToken((s) => (s === id ? null : id));
  }

  function assignToZone(zoneId: string) {
    if (passed || !selectedToken) return;
    playSfx("tap", muted);
    setWrongHint(null);
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
        setWrongHint("Not quite yet. Match every word, then tap Check again.");
        onWrong();
        return;
      }
    }
    setWrongHint(null);
    onPass();
  }

  const labelForZone = (zoneId: string) => {
    const tid = tokens.find((t) => assignment[t.id] === zoneId)?.id;
    const label = tid ? (tokens.find((x) => x.id === tid)?.label ?? tid) : null;
    return label;
  };

  return (
    <div className={interactionNavReservePaddingClass}>
      {parsed.image_url ? (
        <div className={gamesHeroImageFrameClass} style={interactionHeroImageHeightStyle}>
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
        {parsed.body_text ? <p className={gamesBodyTextClass}>{parsed.body_text}</p> : null}
        <p className={gamesHintTextClass}>Tap a word, then tap a box</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {tokens.map((t) => {
            const placed = Boolean(assignment[t.id]);
            return (
              <KidButton
                key={t.id}
                type="button"
                variant={selectedToken === t.id ? "primary" : "secondary"}
                disabled={passed}
                className={clsx(gamesChipButtonClass, placed && selectedToken !== t.id && "opacity-70")}
                onClick={() => selectToken(t.id)}
              >
                {t.label}
              </KidButton>
            );
          })}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {zones.map((z) => {
            const placed = labelForZone(z.id);
            const label = placed ?? z.label ?? "Drop here";
            return (
              <button
                key={z.id}
                type="button"
                disabled={passed}
                onClick={() => assignToZone(z.id)}
                className={clsx(
                  gamesMatchZoneClass,
                  placed && "border-solid border-emerald-700 bg-emerald-50 text-emerald-950",
                )}
              >
                {placed ? (
                  <span>
                    <span className="block text-xs font-bold uppercase tracking-wide text-emerald-800/80">
                      {z.label ?? "Box"}
                    </span>
                    {placed}
                  </span>
                ) : (
                  label
                )}
              </button>
            );
          })}
        </div>
        {wrongHint ? <p className={gamesWrongHintClass}>{wrongHint}</p> : null}
        <div className={gamesCheckActionRowClass}>
          <KidButton
            type="button"
            variant="secondary"
            disabled={passed}
            onClick={() => {
              playSfx("tap", muted);
              setAssignment({});
              setSelectedToken(null);
              setWrongHint(null);
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
      <InteractionLessonNav showBack={showBack} onBack={onBack} passed={passed} onNext={onNext} />
    </div>
  );
}
