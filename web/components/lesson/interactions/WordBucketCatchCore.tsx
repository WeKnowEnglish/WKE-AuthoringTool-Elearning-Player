"use client";

import NextImage from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import { speakText } from "@/lib/audio/tts";
import {
  bucketCatchZoneRect,
  bucketRectFromInput,
  randomSpawnItem,
  stepWordBucketCatch,
  type WordBucketCatchChoice,
  type WordBucketCatchConfig,
  type WordBucketCatchFallingItem,
} from "@/lib/lesson/word-bucket-catch";
import {
  computeBucketTestRewards,
  type BucketTestRewardBreakdown,
  type BucketTestRunStats,
} from "@/lib/teststartpage/bucket-test-completion";

const BUCKET_BOTTOM_PAD = 10;

type GamePhase = "playing" | "mcq_recovery" | "won" | "lost";

function rng(): number {
  return Math.random();
}

function choiceLabel(c: WordBucketCatchChoice): string {
  return (c.label ?? c.id).trim() || c.id;
}

type McqSpec = {
  answerChoiceId: string;
  promptLabel: string;
  /** choice ids in display order */
  order: string[];
};

function buildRandomMcq(choices: readonly WordBucketCatchChoice[], roll: () => number): McqSpec {
  const idx = Math.floor(roll() * choices.length);
  const answer = choices[idx]!;
  const order = choices.map((c) => c.id);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(roll() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return {
    answerChoiceId: answer.id,
    promptLabel: choiceLabel(answer),
    order,
  };
}

export function WordBucketCatchCore({
  config: cfg,
  muted,
  locked = false,
  variant = "lesson",
  headerAction,
  instructionalSubline,
  onRoundWin,
  onRoundLose,
  roundEndExtraActions,
  testCompletionEventId,
  onTestGameComplete,
  /** Test-start only: fired on each correct catch (for daily quests / analytics). */
  onTestCorrectCatch,
}: {
  config: WordBucketCatchConfig;
  muted: boolean;
  /** When true (e.g. lesson already passed), freeze the activity. */
  locked?: boolean;
  /** `"test"` enables multi-wave + MCQ recovery when `config.waves` is set. */
  variant?: "lesson" | "test";
  headerAction?: React.ReactNode;
  /** Extra line under the target word (defaults to rules copy). */
  instructionalSubline?: string;
  onRoundWin?: () => void;
  onRoundLose?: () => void;
  /** Shown next to “Play again” / “Retry” (e.g. Close on test overlay). */
  roundEndExtraActions?: React.ReactNode;
  /** Idempotent `eventId` for {@link awardRewards} on test-start completion. */
  testCompletionEventId?: string;
  onTestGameComplete?: (payload: {
    breakdown: BucketTestRewardBreakdown;
    stats: BucketTestRunStats;
    completionEventId?: string;
  }) => void;
  onTestCorrectCatch?: () => void;
}) {
  const isMultiWaveTest = variant === "test" && !!cfg.waves?.length;
  const catchesPerWave = cfg.catches_per_wave ?? (isMultiWaveTest ? 3 : cfg.required_correct_catches);
  const waveCount = cfg.waves?.length ?? 0;
  const totalCatchesNeeded = useMemo(() => {
    if (isMultiWaveTest && waveCount > 0) return waveCount * catchesPerWave;
    return cfg.required_correct_catches;
  }, [isMultiWaveTest, waveCount, catchesPerWave, cfg.required_correct_catches]);

  const playfieldRef = useRef<HTMLDivElement | null>(null);
  const itemsRef = useRef<WordBucketCatchFallingItem[]>([]);
  const bucketCenterXRef = useRef(160);
  const spawnAccRef = useRef(cfg.spawn_interval_ms);
  const lastTsRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef<GamePhase>("playing");
  const draggingRef = useRef(false);
  const correctCountRef = useRef(0);
  const winReportedRef = useRef(false);
  const onRoundWinRef = useRef(onRoundWin);
  const onRoundLoseRef = useRef(onRoundLose);
  const onTestGameCompleteRef = useRef(onTestGameComplete);
  const onTestCorrectCatchRef = useRef(onTestCorrectCatch);

  const waveIndexRef = useRef(0);
  const catchesThisWaveRef = useRef(0);
  const activeCorrectChoiceIdRef = useRef<string | null>(null);
  /** Wave target picture (trimmed URL); matches all choice rows that reuse this asset. */
  const activeCorrectImageUrlRef = useRef<string | null>(null);
  const gameT0Ref = useRef<number | null>(null);
  const wrongCatchCountRef = useRef(0);
  const mcqWrongPicksRef = useRef(0);
  /** Increments each full-game win so test-start `eventId` stays unique for “Play again”. */
  const winSessionRef = useRef(0);

  const mcqSpecRef = useRef<McqSpec | null>(null);
  const [mcqUi, setMcqUi] = useState<McqSpec | null>(null);

  useEffect(() => {
    onRoundWinRef.current = onRoundWin;
    onRoundLoseRef.current = onRoundLose;
    onTestGameCompleteRef.current = onTestGameComplete;
    onTestCorrectCatchRef.current = onTestCorrectCatch;
  }, [onRoundWin, onRoundLose, onTestGameComplete, onTestCorrectCatch]);

  const [phase, setPhase] = useState<GamePhase>(locked ? "won" : "playing");
  const [tick, setTick] = useState(0);
  const [playfieldSize, setPlayfieldSize] = useState({ w: 320, h: 360 });
  const [correctUi, setCorrectUi] = useState(locked ? totalCatchesNeeded : 0);
  const [displayTargetWord, setDisplayTargetWord] = useState(cfg.target_word);
  const [roundDisplay, setRoundDisplay] = useState(1);
  const [winBreakdown, setWinBreakdown] = useState<BucketTestRewardBreakdown | null>(null);

  const syncWaveRefs = useCallback(() => {
    if (isMultiWaveTest && cfg.waves?.length) {
      const wi = Math.min(waveIndexRef.current, cfg.waves.length - 1);
      const wv = cfg.waves[wi]!;
      activeCorrectChoiceIdRef.current = wv.correct_choice_id;
      const anchor = cfg.choices.find((c) => c.id === wv.correct_choice_id);
      activeCorrectImageUrlRef.current = anchor?.image_url?.trim() || null;
      setDisplayTargetWord(wv.target_word);
    } else {
      activeCorrectChoiceIdRef.current = null;
      activeCorrectImageUrlRef.current = null;
      setDisplayTargetWord(cfg.target_word);
    }
  }, [cfg.choices, cfg.target_word, cfg.waves, isMultiWaveTest]);

  const resetGame = useCallback(() => {
    if (locked) return;
    itemsRef.current = [];
    spawnAccRef.current = cfg.spawn_interval_ms;
    lastTsRef.current = null;
    phaseRef.current = "playing";
    correctCountRef.current = 0;
    catchesThisWaveRef.current = 0;
    waveIndexRef.current = 0;
    winReportedRef.current = false;
    wrongCatchCountRef.current = 0;
    mcqWrongPicksRef.current = 0;
    gameT0Ref.current = typeof performance !== "undefined" ? performance.now() : null;
    mcqSpecRef.current = null;
    setMcqUi(null);
    setWinBreakdown(null);
    setPhase("playing");
    setCorrectUi(0);
    setRoundDisplay(1);
    syncWaveRefs();
    if (variant === "test" && cfg.waves?.[0]) {
      speakText(cfg.waves[0].target_word, { muted });
    }
    const w = playfieldRef.current?.clientWidth ?? playfieldSize.w;
    bucketCenterXRef.current = w / 2;
  }, [
    cfg.spawn_interval_ms,
    locked,
    playfieldSize.w,
    syncWaveRefs,
    variant,
    cfg.waves,
    muted,
  ]);

  useEffect(() => {
    const el = playfieldRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setPlayfieldSize({ w: Math.max(120, r.width), h: Math.max(200, r.height) });
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    setPlayfieldSize({ w: Math.max(120, r.width), h: Math.max(200, r.height) });
    bucketCenterXRef.current = r.width / 2;
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    syncWaveRefs();
  }, [syncWaveRefs]);

  useEffect(() => {
    if (locked || variant !== "test" || !cfg.waves?.[0]) return;
    speakText(cfg.waves[0].target_word, { muted });
  }, [locked, variant, cfg.waves, muted]);

  useEffect(() => {
    if (locked) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTsRef.current = null;
      phaseRef.current = "won";
      setPhase("won");
      setCorrectUi(totalCatchesNeeded);
      return;
    }
  }, [locked, totalCatchesNeeded]);

  useEffect(() => {
    if (locked || phase !== "playing") {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTsRef.current = null;
      return;
    }

    if (gameT0Ref.current == null && typeof performance !== "undefined") {
      gameT0Ref.current = performance.now();
    }

    function frame(ts: number) {
      if (phaseRef.current !== "playing" || locked) return;

      const last = lastTsRef.current;
      lastTsRef.current = ts;
      const dt = last == null ? 0 : Math.min(0.05, (ts - last) / 1000);

      const el = playfieldRef.current;
      const rawW = el?.clientWidth ?? playfieldSize.w;
      const rawH = el?.clientHeight ?? playfieldSize.h;
      const w = Math.max(120, rawW);
      const h = Math.max(160, rawH);
      const bw = cfg.bucket_width_px;
      const bh = cfg.bucket_height_px;
      bucketCenterXRef.current = Math.min(
        Math.max(bw / 2 + 4, bucketCenterXRef.current),
        w - bw / 2 - 4,
      );

      const bucket = bucketRectFromInput({
        playfieldW: w,
        playfieldH: h,
        bucketXCenter: bucketCenterXRef.current,
        bucketW: bw,
        bucketH: bh,
        bottomPad: BUCKET_BOTTOM_PAD,
      });
      const catchZone = bucketCatchZoneRect(bucket);

      const correctIdForSpawn =
        isMultiWaveTest && activeCorrectChoiceIdRef.current ?
          activeCorrectChoiceIdRef.current
        : null;
      const correctImgForSpawn =
        isMultiWaveTest && activeCorrectImageUrlRef.current ?
          activeCorrectImageUrlRef.current
        : undefined;

      if (dt > 0) {
        const { next, result } = stepWordBucketCatch(
          itemsRef.current,
          dt,
          {
            fall_speed_px_per_sec: cfg.fall_speed_px_per_sec,
            item_size_px: cfg.item_size_px,
          },
          h,
          catchZone,
        );
        itemsRef.current = next;

        if (result.kind === "caught_correct") {
          correctCountRef.current += 1;
          catchesThisWaveRef.current += 1;
          setCorrectUi(correctCountRef.current);
          playSfx("correct", muted);
          if (variant === "test") {
            onTestCorrectCatchRef.current?.();
          }

          const doneWave =
            isMultiWaveTest &&
            cfg.waves?.length &&
            catchesThisWaveRef.current >= catchesPerWave;
          const lastWaveIdx = (cfg.waves?.length ?? 1) - 1;

          if (doneWave && waveIndexRef.current < lastWaveIdx) {
            waveIndexRef.current += 1;
            catchesThisWaveRef.current = 0;
            itemsRef.current = [];
            const wv = cfg.waves![waveIndexRef.current]!;
            activeCorrectChoiceIdRef.current = wv.correct_choice_id;
            const anchor = cfg.choices.find((c) => c.id === wv.correct_choice_id);
            activeCorrectImageUrlRef.current = anchor?.image_url?.trim() || null;
            setDisplayTargetWord(wv.target_word);
            setRoundDisplay(waveIndexRef.current + 1);
            speakText(wv.target_word, { muted });
          } else if (correctCountRef.current >= totalCatchesNeeded) {
            phaseRef.current = "won";
            setPhase("won");
            playSfx("complete", muted);
            if (!winReportedRef.current) {
              winReportedRef.current = true;
              onRoundWinRef.current?.();
              if (isMultiWaveTest && gameT0Ref.current != null && typeof performance !== "undefined") {
                const elapsedMs = Math.max(0, performance.now() - gameT0Ref.current);
                const stats: BucketTestRunStats = {
                  elapsedMs,
                  wrongCatchCount: wrongCatchCountRef.current,
                  mcqWrongPicks: mcqWrongPicksRef.current,
                };
                const breakdown = computeBucketTestRewards(stats);
                setWinBreakdown(breakdown);
                winSessionRef.current += 1;
                const completionId =
                  testCompletionEventId ?
                    `${testCompletionEventId}#${winSessionRef.current}`
                  : undefined;
                onTestGameCompleteRef.current?.({
                  breakdown,
                  stats,
                  completionEventId: completionId,
                });
              }
            }
          }
        } else if (result.kind === "caught_wrong") {
          playSfx("wrong", muted);
          if (isMultiWaveTest) {
            wrongCatchCountRef.current += 1;
            const spec = buildRandomMcq(cfg.choices, rng);
            mcqSpecRef.current = spec;
            setMcqUi(spec);
            phaseRef.current = "mcq_recovery";
            setPhase("mcq_recovery");
          } else {
            phaseRef.current = "lost";
            setPhase("lost");
            onRoundLoseRef.current?.();
          }
        }

        spawnAccRef.current += dt * 1000;
        while (
          phaseRef.current === "playing" &&
          spawnAccRef.current >= cfg.spawn_interval_ms
        ) {
          spawnAccRef.current -= cfg.spawn_interval_ms;
          itemsRef.current.push(
            randomSpawnItem(
              cfg.choices,
              w,
              cfg.item_size_px,
              rng,
              correctIdForSpawn ?? undefined,
              correctImgForSpawn,
            ),
          );
        }
      }

      setTick((t) => t + 1);
      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = null;
    };
  }, [
    locked,
    phase,
    muted,
    variant,
    cfg.bucket_width_px,
    cfg.bucket_height_px,
    cfg.choices,
    cfg.fall_speed_px_per_sec,
    cfg.item_size_px,
    cfg.spawn_interval_ms,
    cfg.waves,
    catchesPerWave,
    isMultiWaveTest,
    totalCatchesNeeded,
    playfieldSize.w,
    playfieldSize.h,
    testCompletionEventId,
  ]);

  const resolveMcqPick = (pickedId: string) => {
    if (locked || phase !== "mcq_recovery" || !mcqSpecRef.current) return;
    const spec = mcqSpecRef.current;
    if (pickedId === spec.answerChoiceId) {
      playSfx("correct", muted);
      mcqSpecRef.current = null;
      setMcqUi(null);
      phaseRef.current = "playing";
      setPhase("playing");
      lastTsRef.current = null;
    } else {
      mcqWrongPicksRef.current += 1;
      playSfx("wrong", muted);
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (locked || phase !== "playing") return;
    draggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    playSfx("tap", muted);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current || locked || phase !== "playing") return;
    const el = playfieldRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    bucketCenterXRef.current = Math.min(
      Math.max(cfg.bucket_width_px / 2 + 4, e.clientX - r.left),
      r.width - cfg.bucket_width_px / 2 - 4,
    );
  };

  const onPointerUp = (e: React.PointerEvent) => {
    draggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const w = playfieldSize.w;
  const h = playfieldSize.h;
  const bucket = bucketRectFromInput({
    playfieldW: w,
    playfieldH: h,
    bucketXCenter: bucketCenterXRef.current,
    bucketW: cfg.bucket_width_px,
    bucketH: cfg.bucket_height_px,
    bottomPad: BUCKET_BOTTOM_PAD,
  });

  const sub =
    instructionalSubline ??
    (isMultiWaveTest ?
      `Three rounds: catch ${catchesPerWave} pictures per word. Wrong catch? Pick the right picture for one word, then keep going.`
    : `Line up the top of the bucket under falling pictures. Catch ${cfg.required_correct_catches} that match the word. Wrong pictures can fall away — you only lose if you catch a wrong one.`);

  void tick;

  const choiceById = useMemo(() => {
    const m = new Map<string, WordBucketCatchChoice>();
    for (const c of cfg.choices) m.set(c.id, c);
    return m;
  }, [cfg.choices]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <header className="flex shrink-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-kid-ink/70">
            Catch the right picture
          </p>
          <p className="truncate text-2xl font-black text-kid-ink sm:text-3xl">{displayTargetWord}</p>
          <p className="mt-1 text-sm font-semibold text-kid-ink/80">{sub}</p>
          {isMultiWaveTest && waveCount > 0 ? (
            <p className="mt-0.5 text-xs font-bold text-kid-ink/60">
              Round {roundDisplay} of {waveCount}
            </p>
          ) : null}
        </div>
        {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
      </header>

      <div className="flex shrink-0 justify-between pb-1 text-sm font-bold text-kid-ink">
        <span>
          Caught: {correctUi} / {totalCatchesNeeded}
        </span>
        {locked ? (
          <span className="text-emerald-800">Done</span>
        ) : phase === "playing" ? (
          <span className="text-kid-ink/70">Playing</span>
        ) : phase === "mcq_recovery" ? (
          <span className="text-amber-800">Quick check</span>
        ) : null}
      </div>

      <div className="relative min-h-[220px] flex-1 overflow-hidden rounded-xl">
        <div
          ref={playfieldRef}
          className="absolute inset-0 touch-none rounded-xl border-2 border-dashed border-kid-ink/25 bg-gradient-to-b from-sky-100/80 to-sky-50/90 [touch-action:none]"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {!locked
            ? itemsRef.current.map((it) => (
                <div
                  key={it.id}
                  className="pointer-events-none absolute flex items-center justify-center overflow-hidden rounded-md"
                  style={{
                    left: it.x,
                    top: it.y,
                    width: it.w,
                    height: it.h,
                  }}
                >
                  <NextImage
                    src={it.image_url}
                    alt=""
                    width={Math.round(it.w - 2)}
                    height={Math.round(it.h - 2)}
                    className="object-contain drop-shadow-sm"
                    unoptimized={
                      it.image_url.endsWith(".svg") ||
                      it.image_url.includes("supabase.co") ||
                      it.image_url.includes("placehold.co")
                    }
                  />
                </div>
              ))
            : null}

          <div
            className="pointer-events-none absolute flex items-end justify-center rounded-b-2xl border-2 border-kid-ink bg-amber-400 shadow-[inset_0_-6px_0_rgba(0,0,0,0.12)]"
            style={{
              left: bucket.x,
              top: bucket.y,
              width: bucket.w,
              height: bucket.h,
            }}
          >
            <span className="mb-1 text-[10px] font-black uppercase text-amber-950/80">Bucket</span>
          </div>
        </div>

        {!locked && phase === "mcq_recovery" && mcqUi ? (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/35 p-3">
            <KidPanel className="w-full max-w-md shadow-lg">
              <p className="text-center text-lg font-black text-kid-ink">Which picture matches this word?</p>
              <p className="mt-2 text-center text-2xl font-black text-kid-ink">{mcqUi.promptLabel}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {mcqUi.order.map((id) => {
                  const c = choiceById.get(id);
                  if (!c) return null;
                  return (
                    <button
                      key={id}
                      type="button"
                      className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border-4 border-kid-ink bg-white p-1 shadow-[3px_3px_0_#0a2f86] transition-transform active:scale-[0.98]"
                      onClick={() => resolveMcqPick(id)}
                    >
                      <NextImage
                        src={c.image_url}
                        alt=""
                        width={120}
                        height={120}
                        className="object-contain"
                        unoptimized={
                          c.image_url.endsWith(".svg") ||
                          c.image_url.includes("supabase.co") ||
                          c.image_url.includes("placehold.co")
                        }
                      />
                    </button>
                  );
                })}
              </div>
            </KidPanel>
          </div>
        ) : null}

        {!locked && phase === "won" ? (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/25 p-3">
            <KidPanel className="pointer-events-auto w-full max-w-sm shadow-lg">
              <p className="text-center text-xl font-black text-kid-ink">You win!</p>
              {winBreakdown ? (
                <ul className="mt-3 space-y-1 text-center text-sm font-semibold text-kid-ink/85">
                  <li>Completion gold: +{winBreakdown.baseGold}</li>
                  <li>Time bonus: +{winBreakdown.timeBonusGold}</li>
                  <li>Accuracy bonus: +{winBreakdown.accuracyBonusGold}</li>
                  <li className="pt-1 text-base font-black text-kid-ink">Total: {winBreakdown.totalGold} gold</li>
                </ul>
              ) : null}
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <KidButton type="button" onClick={resetGame}>
                  Play again
                </KidButton>
                {roundEndExtraActions}
              </div>
            </KidPanel>
          </div>
        ) : null}
        {!locked && phase === "lost" ? (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/25 p-3">
            <KidPanel className="pointer-events-auto w-full max-w-sm shadow-lg">
              <p className="text-center text-xl font-black text-kid-ink">Try again</p>
              <p className="mt-1 text-center text-sm font-semibold text-kid-ink/80">
                You caught a picture that does not match. Line up the top of the bucket and try again.
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <KidButton type="button" onClick={resetGame}>
                  Retry
                </KidButton>
                {roundEndExtraActions}
              </div>
            </KidPanel>
          </div>
        ) : null}
      </div>
    </div>
  );
}
