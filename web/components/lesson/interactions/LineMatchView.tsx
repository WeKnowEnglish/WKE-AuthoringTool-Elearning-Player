"use client";

import Image from "next/image";
import { clsx } from "clsx";
import { useLayoutEffect, useRef, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import type { ScreenPayload } from "@/lib/lesson-schemas";
import {
  GuideBlock,
  gamesBodyTextClass,
  gamesCheckActionRowClass,
  gamesHeroImageFrameClass,
  gamesHintTextClass,
  gamesMatchTileClass,
  gamesMatchTileLinkedClass,
  gamesMatchTileSelectedClass,
  gamesMatchZoneClass,
  gamesWrongHintClass,
  interactionHeroImageHeightStyle,
  interactionImageFitClass,
  InteractionLessonNav,
  interactionNavReservePaddingClass,
  NavProps,
  unopt,
} from "./shared";

type LineMatchParsed = Extract<
  ScreenPayload,
  { type: "interaction"; subtype: "line_match" }
>;

type LineGeom = { x1: number; y1: number; x2: number; y2: number };

export function LineMatchView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
}: {
  parsed: LineMatchParsed;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps) {
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  /** tokenId -> zoneId */
  const [links, setLinks] = useState<Record<string, string>>({});
  const [lineGeom, setLineGeom] = useState<Record<string, LineGeom>>({});
  const [wrongHint, setWrongHint] = useState<string | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const tokenRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const zoneRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const zones = parsed.zones;
  const tokens = parsed.tokens;

  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const measure = () => {
      const boardRect = board.getBoundingClientRect();
      const next: Record<string, LineGeom> = {};
      for (const [tokenId, zoneId] of Object.entries(links)) {
        const leftEl = tokenRefs.current[tokenId];
        const rightEl = zoneRefs.current[zoneId];
        if (!leftEl || !rightEl) continue;
        const leftRect = leftEl.getBoundingClientRect();
        const rightRect = rightEl.getBoundingClientRect();
        next[tokenId] = {
          x1: leftRect.right - boardRect.left,
          y1: leftRect.top + leftRect.height / 2 - boardRect.top,
          x2: rightRect.left - boardRect.left,
          y2: rightRect.top + rightRect.height / 2 - boardRect.top,
        };
      }
      setLineGeom(next);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(board);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [links, tokens, zones]);

  function selectToken(id: string) {
    if (passed) return;
    playSfx("tap", muted);
    setWrongHint(null);
    setSelectedToken((s) => (s === id ? null : id));
  }

  function connectZone(zoneId: string) {
    if (passed || !selectedToken) return;
    playSfx("tap", muted);
    setWrongHint(null);
    setLinks((prev) => {
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
      const zid = links[tok.id];
      if (!zid || parsed.correct_map[tok.id] !== zid) {
        setWrongHint("Not quite yet. Connect every pair, then tap Check again.");
        onWrong();
        return;
      }
    }
    setWrongHint(null);
    onPass();
  }

  const linkedZoneIds = new Set(Object.values(links));

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
        <p className={gamesHintTextClass}>
          Tap a word on the left, then tap its match on the right
        </p>

        <div ref={boardRef} className="relative">
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden
          >
            {Object.entries(lineGeom).map(([tokenId, geom]) => (
              <line
                key={tokenId}
                x1={geom.x1}
                y1={geom.y1}
                x2={geom.x2}
                y2={geom.y2}
                stroke={passed ? "#15803d" : "#152668"}
                strokeWidth={4}
                strokeLinecap="round"
              />
            ))}
          </svg>

          <div className="grid grid-cols-2 gap-4 sm:gap-8">
            <div className="flex flex-col gap-3">
              {tokens.map((t) => {
                const isLinked = Boolean(links[t.id]);
                const selected = selectedToken === t.id;
                return (
                  <button
                    key={t.id}
                    ref={(el) => {
                      tokenRefs.current[t.id] = el;
                    }}
                    type="button"
                    disabled={passed}
                    onClick={() => selectToken(t.id)}
                    className={clsx(
                      selected
                        ? gamesMatchTileSelectedClass
                        : isLinked
                          ? gamesMatchTileLinkedClass
                          : gamesMatchTileClass,
                    )}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-3">
              {zones.map((z) => {
                const isLinked = linkedZoneIds.has(z.id);
                return (
                  <button
                    key={z.id}
                    ref={(el) => {
                      zoneRefs.current[z.id] = el;
                    }}
                    type="button"
                    disabled={passed || !selectedToken}
                    onClick={() => connectZone(z.id)}
                    className={clsx(
                      gamesMatchZoneClass,
                      isLinked && "border-solid border-emerald-700 bg-emerald-50 text-emerald-950",
                    )}
                  >
                    {z.label ?? "Match"}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {wrongHint ? <p className={gamesWrongHintClass}>{wrongHint}</p> : null}
        <div className={gamesCheckActionRowClass}>
          <KidButton
            type="button"
            variant="secondary"
            disabled={passed}
            onClick={() => {
              playSfx("tap", muted);
              setLinks({});
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
