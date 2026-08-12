"use client";

import Image from "next/image";
import { clsx } from "clsx";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  HomeworkHelpHintCard,
  HomeworkHelpTrigger,
} from "@/components/homework-help/HomeworkHelpCoach";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import {
  advanceMatchPairsHelp,
  applyMatchPairsKick,
  applyMatchPairsReveal,
  applyMatchPairsScaffold,
  emptyHelpStruggle,
  evaluateMatchPairsCheck,
  getMatchPairsHelpStep,
  recordMatchPairsWrongCheck,
  type HelpAction,
  type HelpStruggle,
} from "@/lib/homework-help";
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

const KICK_MS = 480;

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

  const puzzleKey = useMemo(
    () =>
      `${parsed.tokens.map((t) => t.id).join(",")}::${Object.entries(parsed.correct_map)
        .map(([k, v]) => `${k}=${v}`)
        .join(",")}`,
    [parsed.tokens, parsed.correct_map],
  );

  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  /** tokenId -> zoneId */
  const [links, setLinks] = useState<Record<string, string>>({});
  const [lockedTokenIds, setLockedTokenIds] = useState<Set<string>>(() => new Set());
  const [kickingTokenIds, setKickingTokenIds] = useState<Set<string>>(() => new Set());
  const [lineGeom, setLineGeom] = useState<Record<string, LineGeom>>({});
  const [wrongHint, setWrongHint] = useState<string | null>(null);
  const [struggle, setStruggle] = useState<HelpStruggle>(emptyHelpStruggle);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helped, setHelped] = useState(false);
  const kickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const tokenRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const zoneRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const parsedRef = useRef(parsed);
  parsedRef.current = parsed;

  const zones = parsed.zones;
  const tokens = parsed.tokens;
  const imageZones = zones.some((z) => z.image_url?.trim());
  const tokenIds = tokens.map((t) => t.id);

  useEffect(() => {
    if (kickTimerRef.current) {
      clearTimeout(kickTimerRef.current);
      kickTimerRef.current = null;
    }
    setSelectedToken(null);
    setLinks({});
    setLockedTokenIds(new Set());
    setKickingTokenIds(new Set());
    setWrongHint(null);
    setStruggle(emptyHelpStruggle());
    setHelpOpen(false);
    setHelped(false);
  }, [puzzleKey]);

  useEffect(() => {
    return () => {
      if (kickTimerRef.current) clearTimeout(kickTimerRef.current);
    };
  }, []);

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

  const helpStep = getMatchPairsHelpStep({
    tokens,
    zones,
    correctMap: parsed.correct_map,
    links,
    lockedTokenIds,
    struggle,
    instructions: parsed.body_text,
    imageZones,
  });

  function clearKickTimer() {
    if (kickTimerRef.current) {
      clearTimeout(kickTimerRef.current);
      kickTimerRef.current = null;
    }
  }

  function selectToken(id: string) {
    if (passed || kickingTokenIds.size > 0 || lockedTokenIds.has(id)) return;
    playSfx("tap", muted);
    setWrongHint(null);
    setHelpOpen(false);
    setSelectedToken((s) => (s === id ? null : id));
  }

  function connectZone(zoneId: string) {
    if (passed || kickingTokenIds.size > 0 || !selectedToken) return;
    if (lockedTokenIds.has(selectedToken)) return;
    // Don't steal a locked token's zone.
    const lockedOnZone = Object.entries(links).find(
      ([tid, zid]) => zid === zoneId && lockedTokenIds.has(tid),
    );
    if (lockedOnZone) return;

    playSfx("tap", muted);
    setWrongHint(null);
    setHelpOpen(false);
    setLinks((prev) => {
      const next = { ...prev };
      for (const tid of Object.keys(next)) {
        if (next[tid] === zoneId && !lockedTokenIds.has(tid)) delete next[tid];
      }
      next[selectedToken] = zoneId;
      return next;
    });
    setSelectedToken(null);
  }

  function finishPass() {
    setWrongHint(null);
    setHelpOpen(false);
    onPass();
  }

  function check() {
    if (passed || kickingTokenIds.size > 0) return;
    playSfx("tap", muted);
    clearKickTimer();

    const result = evaluateMatchPairsCheck({
      tokenIds,
      correctMap: parsed.correct_map,
      links,
      lockedTokenIds,
    });

    if (result.allCorrect) {
      setLockedTokenIds(new Set(tokenIds));
      finishPass();
      return;
    }

    setStruggle(recordMatchPairsWrongCheck(struggle));
    onWrong();
    setHelpOpen(true);

    if (result.kickTokenIds.length === 0) {
      if (result.lockTokenIds.length > 0) {
        setLockedTokenIds((prev) => {
          const next = new Set(prev);
          for (const id of result.lockTokenIds) next.add(id);
          return next;
        });
      }
      setWrongHint("Not quite yet. Connect every pair, then tap Check again.");
      return;
    }

    setKickingTokenIds(new Set(result.kickTokenIds));
    setWrongHint(
      result.lockTokenIds.length > 0 || lockedTokenIds.size > 0
        ? "Green pairs stay. Red pairs clear — try again."
        : "Not quite yet. Red pairs clear — try again.",
    );

    const kickIds = [...result.kickTokenIds];
    const lockIds = [...result.lockTokenIds];
    kickTimerRef.current = setTimeout(() => {
      kickTimerRef.current = null;
      const next = applyMatchPairsKick({
        links,
        lockedTokenIds,
        lockTokenIds: lockIds,
        kickTokenIds: kickIds,
      });
      setLinks(next.links);
      setLockedTokenIds(new Set(next.lockedTokenIds));
      setKickingTokenIds(new Set());
      setSelectedToken(null);
    }, KICK_MS);
  }

  function clearUnlocked() {
    if (passed || kickingTokenIds.size > 0) return;
    playSfx("tap", muted);
    setWrongHint(null);
    setHelpOpen(false);
    setSelectedToken(null);
    setLinks((prev) => {
      const next: Record<string, string> = {};
      for (const [tid, zid] of Object.entries(prev)) {
        if (lockedTokenIds.has(tid)) next[tid] = zid;
      }
      return next;
    });
  }

  function onHelpAction(action: HelpAction) {
    if (action === "got_it") {
      setHelpOpen(false);
      return;
    }
    if (action === "need_more_help") {
      setStruggle((prev) => advanceMatchPairsHelp(prev));
      return;
    }
    if (action === "show_answer") {
      clearKickTimer();
      setKickingTokenIds(new Set());
      const revealed = applyMatchPairsReveal({
        tokenIds,
        correctMap: parsedRef.current.correct_map,
      });
      setLinks(revealed.links);
      setLockedTokenIds(new Set(revealed.lockedTokenIds));
      setHelped(true);
      setWrongHint(null);
      setHelpOpen(false);
      setSelectedToken(null);
      finishPass();
    }
  }

  function applyScaffoldFromHelp() {
    if (passed || kickingTokenIds.size > 0) return;
    const applied = applyMatchPairsScaffold({
      tokenIds,
      correctMap: parsed.correct_map,
      links,
      lockedTokenIds,
    });
    if (!applied) return;
    playSfx("tap", muted);
    setLinks(applied.links);
    setLockedTokenIds(new Set(applied.lockedTokenIds));
    setHelped(true);
    setSelectedToken(null);
    setWrongHint("I locked that pair in green. Keep going!");
  }

  const canPlaceScaffoldHint =
    !passed &&
    kickingTokenIds.size === 0 &&
    helpOpen &&
    helpStep.level === "scaffold" &&
    helpStep.tip;

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

  function lineStroke(tokenId: string): string {
    if (passed || lockedTokenIds.has(tokenId)) return "#15803d";
    if (kickingTokenIds.has(tokenId)) return "#be123c";
    return "#152668";
  }

  const lineSvg = (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      {Object.entries(lineGeom).map(([tokenId, geom]) => (
        <line
          key={tokenId}
          x1={geom.x1}
          y1={geom.y1}
          x2={geom.x2}
          y2={geom.y2}
          stroke={lineStroke(tokenId)}
          strokeWidth={4}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );

  const wordButton = (t: (typeof tokens)[number]) => {
    const isLinked = Boolean(links[t.id]);
    const selected = selectedToken === t.id;
    const locked = lockedTokenIds.has(t.id);
    const kicking = kickingTokenIds.has(t.id);
    return (
      <button
        key={t.id}
        ref={(el) => {
          tokenRefs.current[t.id] = el;
        }}
        type="button"
        disabled={passed || locked || kickingTokenIds.size > 0}
        onClick={() => selectToken(t.id)}
        className={clsx(
          imageZones
            ? clsx(
                gamesChipButtonClass,
                "mx-auto w-full max-w-[var(--match-cell)] min-w-0 !min-h-0 px-[clamp(0.2rem,1.2cqw,0.85rem)] py-[clamp(0.35rem,2.2cqh,0.9rem)]",
                "text-[clamp(0.7rem,2.6cqw,1.35rem)] leading-tight",
                selected
                  ? "!border-kid-ink !bg-kid-cta"
                  : locked
                    ? "!border-emerald-700 !bg-emerald-100 !text-emerald-950 kid-feedback-glow-correct"
                    : kicking
                      ? "kid-animate-shake !border-rose-700 !bg-rose-100 !text-rose-950"
                      : isLinked
                        ? "!border-emerald-700 !bg-emerald-50 !text-emerald-950"
                        : "!bg-white",
              )
            : selected
              ? gamesMatchTileSelectedClass
              : locked
                ? clsx(gamesMatchTileLinkedClass, "kid-feedback-glow-correct")
                : kicking
                  ? "kid-animate-shake rounded-xl border-4 border-rose-700 bg-rose-100 px-3 py-3 text-left text-lg font-extrabold text-rose-950"
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
    const linkedTokenId = Object.entries(links).find(([, zid]) => zid === z.id)?.[0];
    const isLinked = Boolean(linkedTokenId);
    const locked = linkedTokenId ? lockedTokenIds.has(linkedTokenId) : false;
    const kicking = linkedTokenId ? kickingTokenIds.has(linkedTokenId) : false;
    const zoneImageUrl = z.image_url?.trim();
    const zoneLockedByOther =
      selectedToken != null &&
      Object.entries(links).some(
        ([tid, zid]) => zid === z.id && lockedTokenIds.has(tid),
      );
    return (
      <button
        key={z.id}
        ref={(el) => {
          zoneRefs.current[z.id] = el;
        }}
        type="button"
        disabled={
          passed ||
          !selectedToken ||
          kickingTokenIds.size > 0 ||
          zoneLockedByOther
        }
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
                locked && "border-solid border-emerald-700 ring-2 ring-emerald-300",
                kicking && "kid-animate-shake border-solid border-rose-700 ring-2 ring-rose-300",
                isLinked && !locked && !kicking && "border-solid border-emerald-700 ring-2 ring-emerald-300",
              )
            : clsx(
                gamesMatchZoneClass,
                locked && "border-solid border-emerald-700 bg-emerald-100 text-emerald-950",
                kicking &&
                  "kid-animate-shake border-solid border-rose-700 bg-rose-100 text-rose-950",
                isLinked &&
                  !locked &&
                  !kicking &&
                  "border-solid border-emerald-700 bg-emerald-50 text-emerald-950",
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
        {helped && !wrongHint ? (
          <p className="mt-2 text-sm font-bold text-emerald-800">
            Helper locked a pair for you — keep matching.
          </p>
        ) : null}

        {helpOpen ? (
          <div className={clsx("mt-2", stageFooter && "shrink-0")}>
            <HomeworkHelpHintCard
              step={helpStep}
              onClose={() => setHelpOpen(false)}
              onAction={onHelpAction}
            />
            {canPlaceScaffoldHint ? (
              <div className="mt-2">
                <KidButton
                  type="button"
                  variant="secondary"
                  className="!min-h-11 !min-w-0 !px-4 !text-sm"
                  onClick={applyScaffoldFromHelp}
                >
                  Place the hint pair
                </KidButton>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className={clsx(gamesCheckActionRowClass, "flex-wrap", stageFooter && "shrink-0")}>
          <KidButton
            type="button"
            variant="secondary"
            disabled={passed || kickingTokenIds.size > 0}
            onClick={clearUnlocked}
          >
            Clear
          </KidButton>
          <HomeworkHelpTrigger
            onOpen={() => setHelpOpen(true)}
            className={passed ? "pointer-events-none opacity-40" : undefined}
          />
          <KidButton
            type="button"
            disabled={passed || kickingTokenIds.size > 0}
            onClick={check}
          >
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
