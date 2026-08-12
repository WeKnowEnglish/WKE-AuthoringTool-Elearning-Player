"use client";

import Image from "next/image";
import { clsx } from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
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

const KICK_MS = 480;

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

  const puzzleKey = useMemo(
    () =>
      `${parsed.tokens.map((t) => t.id).join(",")}::${Object.entries(parsed.correct_map)
        .map(([k, v]) => `${k}=${v}`)
        .join(",")}`,
    [parsed.tokens, parsed.correct_map],
  );

  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  /** tokenId -> zoneId */
  const [assignment, setAssignment] = useState<Record<string, string>>({});
  const [lockedTokenIds, setLockedTokenIds] = useState<Set<string>>(() => new Set());
  const [kickingTokenIds, setKickingTokenIds] = useState<Set<string>>(() => new Set());
  const [wrongHint, setWrongHint] = useState<string | null>(null);
  const [struggle, setStruggle] = useState<HelpStruggle>(emptyHelpStruggle);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helped, setHelped] = useState(false);
  const kickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    setAssignment({});
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

  const helpStep = getMatchPairsHelpStep({
    tokens,
    zones,
    correctMap: parsed.correct_map,
    links: assignment,
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

  function assignToZone(zoneId: string) {
    if (passed || kickingTokenIds.size > 0 || !selectedToken) return;
    if (lockedTokenIds.has(selectedToken)) return;
    const lockedOnZone = Object.entries(assignment).find(
      ([tid, zid]) => zid === zoneId && lockedTokenIds.has(tid),
    );
    if (lockedOnZone) return;

    playSfx("tap", muted);
    setWrongHint(null);
    setHelpOpen(false);
    setAssignment((prev) => {
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
      links: assignment,
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
      setWrongHint("Not quite yet. Match every word, then tap Check again.");
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
        links: assignment,
        lockedTokenIds,
        lockTokenIds: lockIds,
        kickTokenIds: kickIds,
      });
      setAssignment(next.links);
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
    setAssignment((prev) => {
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
      setAssignment(revealed.links);
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
      links: assignment,
      lockedTokenIds,
    });
    if (!applied) return;
    playSfx("tap", muted);
    setAssignment(applied.links);
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

  const labelForZone = (zoneId: string) => {
    const tid = tokens.find((t) => assignment[t.id] === zoneId)?.id;
    const label = tid ? (tokens.find((x) => x.id === tid)?.label ?? tid) : null;
    return label;
  };

  const tokenIdForZone = (zoneId: string) =>
    Object.entries(assignment).find(([, zid]) => zid === zoneId)?.[0] ?? null;

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
            const locked = lockedTokenIds.has(t.id);
            const kicking = kickingTokenIds.has(t.id);
            return (
              <KidButton
                key={t.id}
                type="button"
                variant={selectedToken === t.id ? "primary" : "secondary"}
                disabled={passed || locked || kickingTokenIds.size > 0}
                className={clsx(
                  gamesChipButtonClass,
                  locked && "!border-emerald-700 !bg-emerald-100 !text-emerald-950",
                  kicking && "kid-animate-shake !border-rose-700 !bg-rose-100 !text-rose-950",
                  placed && !locked && !kicking && selectedToken !== t.id && "opacity-70",
                )}
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
            imageZones ? "grid-cols-2 sm:grid-cols-3" : "sm:grid-cols-2",
            stageFooter && "min-h-0 flex-1 gap-2",
          )}
        >
          {zones.map((z) => {
            const placed = labelForZone(z.id);
            const linkedTokenId = tokenIdForZone(z.id);
            const locked = linkedTokenId ? lockedTokenIds.has(linkedTokenId) : false;
            const kicking = linkedTokenId ? kickingTokenIds.has(linkedTokenId) : false;
            const zoneImageUrl = z.image_url?.trim();
            const label = placed ?? z.label ?? (imageZones ? "" : "Drop here");
            const zoneLockedByOther =
              selectedToken != null &&
              Object.entries(assignment).some(
                ([tid, zid]) => zid === z.id && lockedTokenIds.has(tid),
              );
            return (
              <button
                key={z.id}
                type="button"
                disabled={passed || kickingTokenIds.size > 0 || zoneLockedByOther}
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
                  locked &&
                    (zoneImageUrl
                      ? "border-solid border-emerald-700 ring-2 ring-emerald-300"
                      : "border-solid border-emerald-700 bg-emerald-100 text-emerald-950"),
                  kicking &&
                    (zoneImageUrl
                      ? "kid-animate-shake border-solid border-rose-700 ring-2 ring-rose-300"
                      : "kid-animate-shake border-solid border-rose-700 bg-rose-100 text-rose-950"),
                  placed &&
                    !locked &&
                    !kicking &&
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
                      <span
                        className={clsx(
                          "absolute inset-x-1 bottom-1 rounded-md border-2 bg-white/95 px-2 py-0.5 text-center text-sm font-extrabold",
                          locked
                            ? "border-emerald-800 text-emerald-950"
                            : kicking
                              ? "border-rose-800 text-rose-950"
                              : "border-emerald-800 text-emerald-950",
                        )}
                      >
                        {placed}
                      </span>
                    ) : null}
                  </>
                ) : placed ? (
                  <span>
                    <span
                      className={clsx(
                        "block text-xs font-bold uppercase tracking-wide",
                        kicking ? "text-rose-800/80" : "text-emerald-800/80",
                      )}
                    >
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

        <div className={clsx(gamesCheckActionRowClass, "flex-wrap")}>
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
