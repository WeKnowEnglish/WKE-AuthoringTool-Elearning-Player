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
  interactionLessonShellClass,
  InteractionShellNav,
  isStageFooterNav,
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
  controlsPlacement,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "drag_match" }>;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps) {
  const stageFooter = isStageFooterNav(controlsPlacement);
  const shellClass = interactionLessonShellClass(controlsPlacement);
  const panelClass = stageFooter
    ? "flex min-h-0 flex-1 flex-col overflow-hidden gap-2 !p-3 sm:!p-4"
    : undefined;
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  /** tokenId -> zoneId */
  const [assignment, setAssignment] = useState<Record<string, string>>({});
  const [wrongHint, setWrongHint] = useState<string | null>(null);

  const zones = parsed.zones;
  const tokens = parsed.tokens;
  const imageZones = zones.some((z) => z.image_url?.trim());

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
    <div className={shellClass}>
      {parsed.image_url ? (
        <div
          className={gamesHeroImageFrameClass}
          style={
            stageFooter
              ? { height: "min(18dvh, calc(100dvh - 24rem))" }
              : interactionHeroImageHeightStyle
          }
        >
          <Image
            src={parsed.image_url}
            alt=""
            fill
            className={interactionImageFitClass(parsed.image_fit)}
            unoptimized={unopt(parsed.image_url)}
          />
        </div>
      ) : null}
      <KidPanel className={panelClass}>
        {parsed.body_text ? (
          <p className={clsx(gamesBodyTextClass, stageFooter && "!mb-2 !text-lg")}>
            {parsed.body_text}
          </p>
        ) : null}
        <p className={clsx(gamesHintTextClass, stageFooter && "!mb-2 !text-sm")}>
          {imageZones ? "Tap a word, then tap a picture" : "Tap a word, then tap a box"}
        </p>
        <div className={clsx("mb-4 flex flex-wrap gap-2", stageFooter && "mb-2 gap-1.5")}>
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
        <div
          className={clsx(
            "grid gap-3",
            imageZones
              ? "grid-cols-2 sm:grid-cols-3"
              : "sm:grid-cols-2",
            stageFooter && "min-h-0 flex-1 gap-2",
          )}
        >
          {zones.map((z) => {
            const placed = labelForZone(z.id);
            const zoneImageUrl = z.image_url?.trim();
            const label = placed ?? z.label ?? (imageZones ? "" : "Drop here");
            return (
              <button
                key={z.id}
                type="button"
                disabled={passed}
                onClick={() => assignToZone(z.id)}
                aria-label={
                  zoneImageUrl
                    ? placed
                      ? `${placed} matched to ${z.label ?? "picture"}`
                      : z.label
                        ? `Picture: ${z.label}`
                        : "Picture drop zone"
                    : placed
                      ? `${placed} matched to ${z.label ?? "box"}`
                      : z.label ?? "Drop here"
                }
                className={clsx(
                  zoneImageUrl
                    ? "relative aspect-square min-h-0 w-full overflow-hidden rounded-xl border-4 border-dashed border-kid-ink bg-kid-panel p-1 transition hover:bg-kid-surface-muted active:bg-kid-surface disabled:opacity-60"
                    : gamesMatchZoneClass,
                  placed &&
                    (zoneImageUrl
                      ? "border-solid border-emerald-700 ring-2 ring-emerald-300"
                      : "border-solid border-emerald-700 bg-emerald-50 text-emerald-950"),
                )}
              >
                {zoneImageUrl ? (
                  <>
                    <Image
                      src={zoneImageUrl}
                      alt={z.label ?? ""}
                      fill
                      className={interactionImageFitClass(parsed.image_fit)}
                      unoptimized={unopt(zoneImageUrl)}
                    />
                    {placed ? (
                      <span className="absolute inset-x-1 bottom-1 rounded-md border-2 border-emerald-800 bg-white/95 px-2 py-0.5 text-center text-sm font-extrabold text-emerald-950">
                        {placed}
                      </span>
                    ) : null}
                  </>
                ) : placed ? (
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
      <InteractionShellNav
        showBack={showBack}
        onBack={onBack}
        passed={passed}
        onNext={onNext}
        controlsPlacement={controlsPlacement}
      />
    </div>
  );
}
