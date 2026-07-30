"use client";

import Image from "next/image";
import { clsx } from "clsx";
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
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
  gamesMatchTileClass,
  gamesMatchTileLinkedClass,
  gamesMatchTileSelectedClass,
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

type LineMatchParsed = Extract<
  ScreenPayload,
  { type: "interaction"; subtype: "line_match" }
>;

type LineGeom = { x1: number; y1: number; x2: number; y2: number };

function measureLineGeom(
  board: HTMLDivElement,
  links: Record<string, string>,
  tokenRefs: Record<string, HTMLButtonElement | null>,
  zoneRefs: Record<string, HTMLButtonElement | null>,
  vertical: boolean,
): Record<string, LineGeom> {
  const boardRect = board.getBoundingClientRect();
  const next: Record<string, LineGeom> = {};
  for (const [tokenId, zoneId] of Object.entries(links)) {
    const tokenEl = tokenRefs[tokenId];
    const zoneEl = zoneRefs[zoneId];
    if (!tokenEl || !zoneEl) continue;
    const tokenRect = tokenEl.getBoundingClientRect();
    const zoneRect = zoneEl.getBoundingClientRect();
    if (vertical) {
      next[tokenId] = {
        x1: tokenRect.left + tokenRect.width / 2 - boardRect.left,
        y1: tokenRect.bottom - boardRect.top,
        x2: zoneRect.left + zoneRect.width / 2 - boardRect.left,
        y2: zoneRect.top - boardRect.top,
      };
    } else {
      next[tokenId] = {
        x1: tokenRect.right - boardRect.left,
        y1: tokenRect.top + tokenRect.height / 2 - boardRect.top,
        x2: zoneRect.left - boardRect.left,
        y2: zoneRect.top + zoneRect.height / 2 - boardRect.top,
      };
    }
  }
  return next;
}

export function LineMatchView({
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
  parsed: LineMatchParsed;
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
  const [links, setLinks] = useState<Record<string, string>>({});
  const [lineGeom, setLineGeom] = useState<Record<string, LineGeom>>({});
  const [wrongHint, setWrongHint] = useState<string | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const tokenRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const zoneRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const zones = parsed.zones;
  const tokens = parsed.tokens;
  const imageZones = zones.some((z) => z.image_url?.trim());

  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const measure = () => {
      setLineGeom(
        measureLineGeom(board, links, tokenRefs.current, zoneRefs.current, imageZones),
      );
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(board);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [imageZones, links, tokens, zones]);

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
  const itemCount = tokens.length;
  const imageRowStyle =
    itemCount > 0
      ? ({ gridTemplateColumns: `repeat(${itemCount}, minmax(0, 1fr))` } as const)
      : undefined;
  const imageBoardStyle =
    imageZones && itemCount > 0
      ? ({
          ["--match-gap" as string]: "clamp(0.35rem, 1.8cqw, 1rem)",
          ["--match-cell" as string]: `min(calc((100cqw - ${itemCount - 1} * var(--match-gap)) / ${itemCount}), min(36cqh, 16rem))`,
        } as CSSProperties)
      : undefined;

  const hintText = imageZones
    ? "Tap a word, then tap its picture"
    : "Tap a word on the left, then tap its match on the right";

  const lineSvg = (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      {Object.entries(lineGeom).map(([tokenId, geom]) => (
        <line
          key={tokenId}
          x1={geom.x1}
          y1={geom.y1}
          x2={geom.x2}
          y2={geom.y2}
          stroke={passed ? "#15803d" : "#152668"}
          strokeWidth={imageZones ? 4 : 4}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );

  const wordButton = (t: (typeof tokens)[number]) => {
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
          imageZones
            ? clsx(
                gamesChipButtonClass,
                "mx-auto w-full max-w-[var(--match-cell)] min-w-0 !min-h-0 px-[clamp(0.2rem,1.2cqw,0.85rem)] py-[clamp(0.35rem,2.2cqh,0.9rem)]",
                "text-[clamp(0.7rem,2.6cqw,1.35rem)] leading-tight",
                selected
                  ? "!border-kid-ink !bg-kid-cta"
                  : isLinked
                    ? "!border-emerald-700 !bg-emerald-50 !text-emerald-950"
                    : "!bg-white",
              )
            : selected
              ? gamesMatchTileSelectedClass
              : isLinked
                ? gamesMatchTileLinkedClass
                : gamesMatchTileClass,
        )}
      >
        {t.label}
      </button>
    );
  };

  const zoneButton = (z: (typeof zones)[number]) => {
    const isLinked = linkedZoneIds.has(z.id);
    const zoneImageUrl = z.image_url?.trim();
    return (
      <button
        key={z.id}
        ref={(el) => {
          zoneRefs.current[z.id] = el;
        }}
        type="button"
        disabled={passed || !selectedToken}
        onClick={() => connectZone(z.id)}
        aria-label={
          zoneImageUrl
            ? z.label
              ? `Picture: ${z.label}`
              : "Picture"
            : z.label ?? "Match"
        }
        className={clsx(
          zoneImageUrl
            ? clsx(
                "relative mx-auto aspect-square w-full max-w-[var(--match-cell)] overflow-hidden rounded-xl border-4 border-dashed border-kid-ink bg-kid-panel transition",
                "hover:bg-kid-surface-muted active:bg-kid-surface disabled:opacity-60",
                isLinked && "border-solid border-emerald-700 ring-2 ring-emerald-300",
              )
            : clsx(
                gamesMatchZoneClass,
                isLinked && "border-solid border-emerald-700 bg-emerald-50 text-emerald-950",
              ),
        )}
      >
        {zoneImageUrl ? (
          <Image
            src={zoneImageUrl}
            alt={z.label ?? ""}
            fill
            className={interactionImageFitClass("contain")}
            unoptimized={unopt(zoneImageUrl)}
          />
        ) : (
          z.label ?? "Match"
        )}
      </button>
    );
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
            className={interactionImageFitClass("contain")}
            unoptimized={unopt(parsed.image_url)}
          />
        </div>
      ) : null}
      <KidPanel className={panelClass}>
        {parsed.body_text ? (
          <p className={clsx(gamesBodyTextClass, stageFooter && "!mb-1 !text-lg")}>
            {parsed.body_text}
          </p>
        ) : null}
        <p className={clsx(gamesHintTextClass, stageFooter && "!mb-1 !text-sm")}>{hintText}</p>

        <div
          ref={boardRef}
          style={imageBoardStyle}
          className={clsx(
            "relative",
            imageZones &&
              "flex min-h-0 flex-1 flex-col [container-type:size] @container/board px-[clamp(0.5rem,3.5cqw,1.75rem)] py-[clamp(0.25rem,2cqh,1rem)]",
          )}
        >
          {lineSvg}

          {imageZones ? (
            <>
              <div
                className="grid w-full shrink-0 gap-[var(--match-gap)]"
                style={imageRowStyle}
              >
                {tokens.map(wordButton)}
              </div>
              <div className="min-h-[clamp(1.5rem,8cqh,4rem)] flex-1" aria-hidden />
              <div
                className="grid w-full shrink-0 gap-[var(--match-gap)]"
                style={imageRowStyle}
              >
                {zones.map(zoneButton)}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:gap-8">
              <div className="flex flex-col gap-3">{tokens.map(wordButton)}</div>
              <div className="flex flex-col gap-3">{zones.map(zoneButton)}</div>
            </div>
          )}
        </div>

        {wrongHint ? <p className={gamesWrongHintClass}>{wrongHint}</p> : null}
        <div className={clsx(gamesCheckActionRowClass, stageFooter && "shrink-0")}>
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
