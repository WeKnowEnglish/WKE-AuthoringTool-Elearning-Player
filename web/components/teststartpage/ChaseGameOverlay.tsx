"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { McQuizView } from "@/components/lesson/interactions/McQuizView";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import type { ScreenPayload } from "@/lib/lesson-schemas";
import { awardRewards } from "@/lib/progress/rewards";
import {
  CHASE_GROUND_Y,
  CHASE_LEVELS,
  hazardsForLevel,
  type ChaseCoinDef,
  type ChaseDifficultyId,
  type ChaseHazard,
} from "@/lib/teststartpage/chase-game-levels";
import { circleRectHit, rectsOverlap, type Rect } from "@/lib/teststartpage/chase-game-physics";
import {
  loadChaseRefuelMcqs,
  type ChaseRefuelMcPayload,
} from "@/lib/teststartpage/load-chase-refuel-mcqs";
import { bumpDailyQuestProgress } from "@/lib/teststartpage/daily-quests";

const PLAYER_SPRITE = "/media/teststart-chase/player.svg";
const CHASE_ENERGY_MAX = 100;
const PLAYER_W = 44;
const PLAYER_H = 52;
const GRAVITY = 0.62;
const JUMP_V = -13.2;
/** Second jump in the same air sequence (slightly weaker). */
const JUMP_V_DOUBLE = JUMP_V * 0.88;
/** Energy cost for the first jump in a sequence (from ground or after falling). */
const JUMP_ENERGY_FIRST = 10;
/** Energy cost for the second / double jump (higher than the first). */
const JUMP_ENERGY_DOUBLE = 17;
const ZOMBIE_W = 48;
const ZOMBIE_H = 58;
/** Chase keeps zombie ~6px from player then clamps it back — rects never overlap; use gap catch. */
const ZOMBIE_CATCH_GAP_PX = 44;
/** Refuel ends after this many questions answered correctly on the first try (retries do not count). */
const REFUEL_FIRST_TRY_REQUIRED = 2;
/** Preload this many refuel MCQ images before leaving the loading overlay (faster first paint). */
const REFUEL_PREFETCH_IMAGE_COUNT = 2;
const REFUEL_PREFETCH_TIMEOUT_MS = 4500;

type GameMode = "playing" | "refuelLoading" | "refuelQuiz" | "victory";

type CoinState = ChaseCoinDef & { collected: boolean };

function firstRefuelMcqImageUrls(payloads: ChaseRefuelMcPayload[], max: number): string[] {
  const urls: string[] = [];
  for (const p of payloads) {
    if (urls.length >= max) break;
    if (p.type !== "interaction" || p.subtype !== "mc_quiz") continue;
    const u = p.image_url;
    if (typeof u === "string" && u.trim().length > 0) urls.push(u);
  }
  return urls;
}

/** Warm browser cache for refuel quiz images; resolves when all load or on timeout / per-image error. */
function prefetchRefuelMcqImages(urls: string[], timeoutMs: number): Promise<void> {
  if (urls.length === 0) return Promise.resolve();
  const loads = urls.map(
    (src) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = src;
      }),
  );
  return Promise.race([
    Promise.all(loads).then(() => undefined),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, timeoutMs);
    }),
  ]);
}

function safeRect(levelIndex: number): Rect {
  const L = CHASE_LEVELS[levelIndex]!;
  return { x: L.safeX, y: CHASE_GROUND_Y - 140, w: L.safeW, h: 150 };
}

function playerRect(px: number, py: number): Rect {
  return { x: px, y: py, w: PLAYER_W, h: PLAYER_H };
}

function zombieRect(zx: number, zy: number): Rect {
  return { x: zx, y: zy, w: ZOMBIE_W, h: ZOMBIE_H };
}

/** True when zombie is close enough horizontally and overlaps vertically (full overlap is blocked by clamp). */
function playerCaughtByZombie(px: number, py: number, zx: number, zy: number): boolean {
  const pr = playerRect(px, py);
  const zr = zombieRect(zx, zy);
  if (pr.y >= zr.y + zr.h || pr.y + pr.h <= zr.y) return false;
  const gap = px - (zx + ZOMBIE_W);
  return gap <= ZOMBIE_CATCH_GAP_PX;
}

function hazardAsRect(h: ChaseHazard): Rect {
  return { x: h.x, y: h.y, w: h.w, h: h.h };
}

/** Zombie closes horizontal gap toward the player (px/frame at dtScale=1). Ramps up on levels 2–5 (index 1–4). */
function zombieChaseRate(difficulty: ChaseDifficultyId, levelIdx: number): number {
  const t = Math.min(4, Math.max(0, levelIdx));
  if (difficulty === "simple") {
    return 1.72 + t * 0.32 + t * t * 0.065;
  }
  return 2.32 + t * 0.45 + t * t * 0.09;
}

/** When zombie is farther than this behind the player, use full chase speed (smaller = pressure sooner). */
function zombieFarFollowGapPx(levelIdx: number): number {
  const t = Math.min(4, Math.max(0, levelIdx));
  return 86 - Math.round(t * 9.5);
}

/** Multiplier on chase speed in the "closing in" band (higher = more intense). */
function zombieCloseChaseMul(levelIdx: number): number {
  const t = Math.min(4, Math.max(0, levelIdx));
  return Math.min(0.96, 0.52 + t * 0.11);
}

/** Initial zombie distance behind spawn; shrinks on higher levels. */
function zombieStartGapPx(difficulty: ChaseDifficultyId, levelIdx: number): number {
  const t = Math.min(4, Math.max(0, levelIdx));
  const base = difficulty === "simple" ? 460 : 360;
  const floorPx = difficulty === "simple" ? 300 : 275;
  return Math.max(floorPx, Math.round(base - t * 44));
}

function drawHazard(ctx: CanvasRenderingContext2D, h: ChaseHazard) {
  if (h.kind === "lava") {
    ctx.fillStyle = "#b91c1c";
    ctx.fillRect(h.x, h.y, h.w, h.h);
    ctx.fillStyle = "#f97316";
    ctx.fillRect(h.x + 2, h.y + 2, h.w - 4, Math.max(2, h.h - 6));
    ctx.strokeStyle = "#7f1d1d";
    ctx.lineWidth = 2;
    ctx.strokeRect(h.x, h.y, h.w, h.h);
    return;
  }
  ctx.fillStyle = "#334155";
  ctx.beginPath();
  ctx.moveTo(h.x, h.y + h.h);
  ctx.lineTo(h.x + h.w / 2, h.y);
  ctx.lineTo(h.x + h.w, h.y + h.h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 2;
  ctx.stroke();
}

export function ChaseGameOverlay({
  muted,
  onClose,
  onRewardsGranted,
}: {
  muted: boolean;
  onClose: () => void;
  onRewardsGranted?: () => void;
}) {
  const onRewardsGrantedRef = useRef(onRewardsGranted);
  useEffect(() => {
    onRewardsGrantedRef.current = onRewardsGranted;
  }, [onRewardsGranted]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runIdRef = useRef(
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
  );
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const keysRef = useRef({ runRight: false, runLeft: false });
  /** Key / button edges still to process this frame (supports double jump). */
  const jumpQueueRef = useRef(0);
  /** Jumps used since last touching ground (0 = can do first jump, 1 = can do air jump). */
  const jumpsSinceGroundedRef = useRef(0);
  const modeRef = useRef<GameMode>("playing");
  const difficultyRef = useRef<ChaseDifficultyId>("simple");
  /** Camera never scrolls left of this world X (forward-only scroll). */
  const cameraForwardMaxRef = useRef(0);
  const coinsRef = useRef<CoinState[]>([]);
  const coinsCollectedRef = useRef(0);
  const levelIndexRef = useRef(0);
  const playerRef = useRef({ px: 120, py: CHASE_GROUND_Y - PLAYER_H, vy: 0 });
  const zombieRef = useRef({ zx: 0, zy: CHASE_GROUND_Y - ZOMBIE_H });
  const energyRef = useRef(100);
  const groundedRef = useRef(true);
  const inSafeRef = useRef(false);
  /** rAF timestamp (ms): ignore zombie overlap until this time after a catch. */
  const zombieGraceUntilRef = useRef(0);
  /** `performance.now()` ms: ignore hazard damage until this time (after refuel from a hazard). */
  const hazardGraceUntilRef = useRef(0);
  /** True when refuel was started by touching a hazard (apply grace when energy returns). */
  const hazardRefuelGraceActiveRef = useRef(false);

  const [, setResizeGen] = useState(0);
  const [lobby, setLobby] = useState(true);
  const [pendingDifficulty, setPendingDifficulty] = useState<ChaseDifficultyId>("simple");
  const [mode, setMode] = useState<GameMode>("playing");
  const [energyUi, setEnergyUi] = useState(100);
  const [coinsUi, setCoinsUi] = useState(0);
  const [levelUi, setLevelUi] = useState(1);
  const [victoryCoins, setVictoryCoins] = useState(0);
  const [refuelQuestions, setRefuelQuestions] = useState<ChaseRefuelMcPayload[]>([]);
  const refuelQuestionsRef = useRef<ChaseRefuelMcPayload[]>([]);
  const [refuelQIndex, setRefuelQIndex] = useState(0);
  const refuelQIndexRef = useRef(0);
  const [refuelPassed, setRefuelPassed] = useState(false);
  const refuelPassedRef = useRef(false);
  /** Any wrong tap on the current refuel question before a correct answer (disqualifies first-try credit). */
  const refuelWrongThisQuestionRef = useRef(false);
  const refuelAdvanceInFlightRef = useRef(false);
  const refuelFirstTryCorrectRef = useRef(0);
  const [refuelFirstTryUi, setRefuelFirstTryUi] = useState(0);
  const [victoryAwarded, setVictoryAwarded] = useState(false);

  const bumpUi = useCallback(() => {
    setResizeGen((n) => n + 1);
  }, []);

  const syncUiFromRefs = useCallback(() => {
    setEnergyUi(Math.round(energyRef.current));
    setCoinsUi(coinsCollectedRef.current);
    setLevelUi(levelIndexRef.current + 1);
  }, []);

  const stopLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTsRef.current = null;
  }, []);

  const initLevel = useCallback(
    (idx: number, opts?: { resetEnergy?: boolean }) => {
      const L = CHASE_LEVELS[idx]!;
      const p = playerRef.current;
      p.px = 100;
      p.py = CHASE_GROUND_Y - PLAYER_H;
      p.vy = 0;
      const startGap = zombieStartGapPx(difficultyRef.current, idx);
      zombieRef.current.zx = p.px - startGap;
      zombieRef.current.zy = CHASE_GROUND_Y - ZOMBIE_H;
      if (opts?.resetEnergy !== false) {
        energyRef.current = CHASE_ENERGY_MAX;
      }
      coinsRef.current = L.coins.map((c) => ({ ...c, collected: false }));
      groundedRef.current = true;
      jumpQueueRef.current = 0;
      jumpsSinceGroundedRef.current = 0;
      inSafeRef.current = false;
      cameraForwardMaxRef.current = 0;
      syncUiFromRefs();
    },
    [syncUiFromRefs],
  );

  const releaseHazardRefuelGraceIfNeeded = useCallback(() => {
    if (!hazardRefuelGraceActiveRef.current) return;
    hazardRefuelGraceActiveRef.current = false;
    hazardGraceUntilRef.current = performance.now() + 2600;
  }, []);

  const startRefuelFlow = useCallback(() => {
    modeRef.current = "refuelLoading";
    setMode("refuelLoading");
    stopLoop();
    void loadChaseRefuelMcqs(`${runIdRef.current}:refuel:${Date.now()}`).then(async (qs) => {
      setRefuelQuestions(qs);
      setRefuelQIndex(0);
      setRefuelPassed(false);
      refuelPassedRef.current = false;
      refuelWrongThisQuestionRef.current = false;
      refuelFirstTryCorrectRef.current = 0;
      setRefuelFirstTryUi(0);
      refuelAdvanceInFlightRef.current = false;
      if (qs.length < 2) {
        energyRef.current = CHASE_ENERGY_MAX;
        releaseHazardRefuelGraceIfNeeded();
        modeRef.current = "playing";
        setMode("playing");
        lastTsRef.current = null;
        syncUiFromRefs();
        return;
      }
      const urls = firstRefuelMcqImageUrls(qs, REFUEL_PREFETCH_IMAGE_COUNT);
      await prefetchRefuelMcqImages(urls, REFUEL_PREFETCH_TIMEOUT_MS);
      modeRef.current = "refuelQuiz";
      setMode("refuelQuiz");
    });
    syncUiFromRefs();
  }, [releaseHazardRefuelGraceIfNeeded, stopLoop, syncUiFromRefs]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    refuelQuestionsRef.current = refuelQuestions;
  }, [refuelQuestions]);

  useEffect(() => {
    refuelQIndexRef.current = refuelQIndex;
  }, [refuelQIndex]);

  useEffect(() => {
    refuelPassedRef.current = refuelPassed;
  }, [refuelPassed]);

  const spriteRef = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    const img = new Image();
    img.src = PLAYER_SPRITE;
    img.onload = () => {
      spriteRef.current = img;
    };
  }, []);

  const resolveVertical = useCallback((px: number, py: number, vy: number) => {
    let ny = py + vy;
    let nvy = vy;
    const pr = playerRect(px, ny);
    const L = CHASE_LEVELS[levelIndexRef.current]!;

    let onGround = false;
    if (ny + PLAYER_H >= CHASE_GROUND_Y) {
      ny = CHASE_GROUND_Y - PLAYER_H;
      nvy = 0;
      onGround = true;
    }

    for (const plat of L.platforms) {
      const wasAbove = py + PLAYER_H <= plat.y + 0.1;
      const horiz = pr.x + pr.w > plat.x + 2 && pr.x < plat.x + plat.w - 2;
      if (horiz && wasAbove && nvy >= 0 && ny + PLAYER_H >= plat.y && ny + PLAYER_H <= plat.y + 24) {
        ny = plat.y - PLAYER_H;
        nvy = 0;
        onGround = true;
      }
    }

    groundedRef.current = onGround;
    return { py: ny, vy: nvy };
  }, []);

  const tick = useCallback(
    (ts: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const last = lastTsRef.current ?? ts;
      lastTsRef.current = ts;
      const dt = Math.min(32, ts - last);
      const dtScale = dt / (1000 / 60);

      const m = modeRef.current;
      if (m !== "playing") {
        return;
      }

      const L = CHASE_LEVELS[levelIndexRef.current]!;
      const p = playerRef.current;
      const z = zombieRef.current;
      const diff = difficultyRef.current;

      if (groundedRef.current) {
        jumpsSinceGroundedRef.current = 0;
      }
      let spentJumpEnergy = false;
      while (jumpQueueRef.current > 0 && jumpsSinceGroundedRef.current < 2) {
        jumpQueueRef.current -= 1;
        const firstOfSequence = jumpsSinceGroundedRef.current === 0;
        p.vy = firstOfSequence ? JUMP_V : JUMP_V_DOUBLE;
        energyRef.current = Math.max(
          0,
          energyRef.current - (firstOfSequence ? JUMP_ENERGY_FIRST : JUMP_ENERGY_DOUBLE),
        );
        jumpsSinceGroundedRef.current += 1;
        groundedRef.current = false;
        spentJumpEnergy = true;
        playSfx("tap", muted);
      }
      if (spentJumpEnergy) {
        syncUiFromRefs();
      }

      p.vy = Math.min(16, p.vy + GRAVITY * dtScale);
      const vert = resolveVertical(p.px, p.py, p.vy);
      p.py = vert.py;
      p.vy = vert.vy;

      const speed = L.playerRunSpeed * dtScale;
      if (keysRef.current.runRight) {
        p.px += speed;
      }
      if (keysRef.current.runLeft) {
        p.px -= speed;
      }
      p.px = Math.max(0, Math.min(p.px, L.worldLength + 80));

      const chase = zombieChaseRate(diff, levelIndexRef.current);
      const minGap = zombieFarFollowGapPx(levelIndexRef.current);
      const closeMul = zombieCloseChaseMul(levelIndexRef.current);
      const zombieRight = z.zx + ZOMBIE_W;
      const playerLeft = p.px;
      if (zombieRight < playerLeft - minGap) {
        const toClose = playerLeft - minGap - zombieRight;
        z.zx += Math.min(chase * dtScale, Math.max(0, toClose));
      } else if (zombieRight < playerLeft - 6) {
        z.zx += Math.min(chase * closeMul * dtScale, playerLeft - 6 - zombieRight);
      }
      const zxPreClampCatch = z.zx;
      {
        const zRight = z.zx + ZOMBIE_W;
        if (zRight > p.px - 8) {
          z.zx = Math.max(0, p.px - ZOMBIE_W - 78);
        }
      }

      energyRef.current = Math.max(
        0,
        energyRef.current - (L.energyDrainPerSec / 60) * dtScale,
      );

      let pr = playerRect(p.px, p.py);
      if (
        ts >= zombieGraceUntilRef.current &&
        playerCaughtByZombie(p.px, p.py, zxPreClampCatch, z.zy)
      ) {
        coinsCollectedRef.current = Math.floor(coinsCollectedRef.current / 2);
        initLevel(levelIndexRef.current, { resetEnergy: false });
        zombieGraceUntilRef.current = ts + 1700;
        playSfx("wrong", muted);
        pr = playerRect(p.px, p.py);
      }

      if (diff === "obstacles" && performance.now() >= hazardGraceUntilRef.current) {
        for (const h of hazardsForLevel(levelIndexRef.current, diff)) {
          if (rectsOverlap(pr, hazardAsRect(h))) {
            hazardRefuelGraceActiveRef.current = true;
            energyRef.current = 0;
            playSfx("wrong", muted);
            startRefuelFlow();
            return;
          }
        }
      }

      for (const c of coinsRef.current) {
        if (c.collected) continue;
        if (circleRectHit(c.x, c.y, c.r, pr)) {
          c.collected = true;
          coinsCollectedRef.current += 1;
          playSfx("correct", muted);
        }
      }

      const safe = safeRect(levelIndexRef.current);
      const touchingSafe = rectsOverlap(pr, safe);
      if (touchingSafe) {
        if (!inSafeRef.current) {
          inSafeRef.current = true;
          if (levelIndexRef.current >= CHASE_LEVELS.length - 1) {
            modeRef.current = "victory";
            setVictoryCoins(coinsCollectedRef.current);
            setMode("victory");
            stopLoop();
            playSfx("complete", muted);
            return;
          }
          levelIndexRef.current += 1;
          initLevel(levelIndexRef.current, { resetEnergy: false });
          playSfx("tap", muted);
          bumpDailyQuestProgress("chase_levels", 1);
          onRewardsGrantedRef.current?.();
        }
      } else {
        inSafeRef.current = false;
      }

      if (energyRef.current <= 0) {
        startRefuelFlow();
        return;
      }

      const w = canvas.width;
      const h = canvas.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;

      const margin = w > 0 ? w * 0.28 : 0;
      const desiredCam = Math.max(0, p.px - margin);
      cameraForwardMaxRef.current = Math.max(cameraForwardMaxRef.current, desiredCam);
      const cameraX = cameraForwardMaxRef.current;

      ctx.fillStyle = "#87ceeb";
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(-cameraX, 0);

      ctx.fillStyle = "#5c3d1e";
      ctx.fillRect(0, CHASE_GROUND_Y, L.worldLength + 400, h);
      ctx.fillStyle = "#4ade80";
      ctx.fillRect(0, CHASE_GROUND_Y, L.worldLength + 400, 6);

      for (const plat of L.platforms) {
        ctx.fillStyle = "#5c3d1e";
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = "#4ade80";
        ctx.fillRect(plat.x, plat.y, plat.w, 5);
      }

      if (diff === "obstacles") {
        for (const haz of hazardsForLevel(levelIndexRef.current, diff)) {
          drawHazard(ctx, haz);
        }
      }

      const sr = safeRect(levelIndexRef.current);
      ctx.fillStyle = "rgba(34,197,94,0.35)";
      ctx.fillRect(sr.x, sr.y, sr.w, sr.h);
      ctx.strokeStyle = "#166534";
      ctx.lineWidth = 3;
      ctx.strokeRect(sr.x, sr.y, sr.w, sr.h);

      for (const c of coinsRef.current) {
        if (c.collected) continue;
        ctx.beginPath();
        ctx.fillStyle = "#facc15";
        ctx.strokeStyle = "#ca8a04";
        ctx.lineWidth = 2;
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.fillStyle = "#14532d";
      ctx.fillRect(z.zx, z.zy, ZOMBIE_W, ZOMBIE_H);
      ctx.fillStyle = "#86efac";
      ctx.fillRect(z.zx + 8, z.zy + 10, 12, 8);
      ctx.fillRect(z.zx + 28, z.zy + 10, 12, 8);

      const spr = spriteRef.current;
      if (spr && spr.complete && spr.naturalWidth > 0) {
        ctx.drawImage(spr, p.px, p.py, PLAYER_W, PLAYER_H);
      } else {
        ctx.fillStyle = "#2563eb";
        ctx.fillRect(p.px, p.py, PLAYER_W, PLAYER_H);
      }

      ctx.restore();

      if (Math.floor(ts / 200) !== Math.floor(last / 200)) {
        syncUiFromRefs();
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [initLevel, muted, resolveVertical, startRefuelFlow, syncUiFromRefs],
  );

  useEffect(() => {
    if (lobby || mode !== "playing") return;
    lastTsRef.current = null;
    rafRef.current = requestAnimationFrame(tick);
    return () => stopLoop();
  }, [lobby, mode, tick, stopLoop]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        if (!e.repeat) jumpQueueRef.current += 1;
      }
      if (e.code === "ArrowRight" || e.key === "d" || e.key === "D") {
        keysRef.current.runRight = true;
      }
      if (e.code === "ArrowLeft" || e.key === "a" || e.key === "A") {
        keysRef.current.runLeft = true;
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "ArrowRight" || e.key === "d" || e.key === "D") {
        keysRef.current.runRight = false;
      }
      if (e.code === "ArrowLeft" || e.key === "a" || e.key === "A") {
        keysRef.current.runLeft = false;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c?.parentElement) return;
    const ro = new ResizeObserver(() => {
      const el = canvasRef.current;
      if (!el?.parentElement) return;
      const rect = el.parentElement.getBoundingClientRect();
      const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
      el.width = Math.floor(rect.width * dpr);
      el.height = Math.floor(rect.height * dpr);
      bumpUi();
    });
    ro.observe(c.parentElement);
    return () => ro.disconnect();
  }, [bumpUi]);

  const finishRefuel = useCallback(() => {
    energyRef.current = CHASE_ENERGY_MAX;
    releaseHazardRefuelGraceIfNeeded();
    refuelFirstTryCorrectRef.current = 0;
    setRefuelFirstTryUi(0);
    refuelWrongThisQuestionRef.current = false;
    refuelAdvanceInFlightRef.current = false;
    modeRef.current = "playing";
    setMode("playing");
    lastTsRef.current = null;
    syncUiFromRefs();
  }, [releaseHazardRefuelGraceIfNeeded, syncUiFromRefs]);

  const advanceRefuelAfterQuestionCorrect = useCallback(() => {
    if (!refuelPassedRef.current || refuelAdvanceInFlightRef.current) return;
    refuelAdvanceInFlightRef.current = true;

    const firstTry = !refuelWrongThisQuestionRef.current;
    refuelWrongThisQuestionRef.current = false;

    if (firstTry) {
      refuelFirstTryCorrectRef.current += 1;
      const n = refuelFirstTryCorrectRef.current;
      setRefuelFirstTryUi(n);
      if (n >= REFUEL_FIRST_TRY_REQUIRED) {
        setRefuelPassed(false);
        refuelPassedRef.current = false;
        refuelAdvanceInFlightRef.current = false;
        finishRefuel();
        return;
      }
    }

    const i = refuelQIndexRef.current;
    const next = i + 1;
    if (next >= refuelQuestionsRef.current.length) {
      refuelAdvanceInFlightRef.current = false;
      void loadChaseRefuelMcqs(`${runIdRef.current}:refuel-append:${Date.now()}`).then((more) => {
        if (more.length === 0) {
          setRefuelPassed(false);
          refuelPassedRef.current = false;
          finishRefuel();
          return;
        }
        setRefuelQuestions((prev) => [...prev, ...more]);
        setRefuelQIndex((idx) => idx + 1);
        setRefuelPassed(false);
        refuelPassedRef.current = false;
      });
      return;
    }

    setRefuelQIndex(next);
    setRefuelPassed(false);
    refuelPassedRef.current = false;
    queueMicrotask(() => {
      refuelAdvanceInFlightRef.current = false;
    });
  }, [finishRefuel]);

  const refuelParsed = refuelQuestions[refuelQIndex] as Extract<
    ScreenPayload,
    { type: "interaction"; subtype: "mc_quiz" }
  > | undefined;

  useEffect(() => {
    if (mode !== "refuelQuiz" || !refuelPassed) return;
    const t = window.setTimeout(() => {
      advanceRefuelAfterQuestionCorrect();
    }, 620);
    return () => window.clearTimeout(t);
  }, [mode, refuelPassed, advanceRefuelAfterQuestionCorrect]);

  useEffect(() => {
    if (mode !== "victory" || victoryAwarded) return;
    const totalCoins = coinsCollectedRef.current;
    bumpDailyQuestProgress("chase_wins", 1);
    awardRewards({
      goldDelta: 10 + totalCoins,
      experienceDelta: 5 + Math.floor(totalCoins / 3),
      eventId: `teststart:chase-complete:${runIdRef.current}`,
    });
    setVictoryAwarded(true);
    onRewardsGranted?.();
  }, [mode, victoryAwarded, onRewardsGranted]);

  const beginFromLobby = useCallback(() => {
    difficultyRef.current = pendingDifficulty;
    runIdRef.current =
      typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
    setVictoryAwarded(false);
    setVictoryCoins(0);
    zombieGraceUntilRef.current = 0;
    hazardGraceUntilRef.current = 0;
    hazardRefuelGraceActiveRef.current = false;
    levelIndexRef.current = 0;
    coinsCollectedRef.current = 0;
    modeRef.current = "playing";
    setMode("playing");
    setLobby(false);
    initLevel(0, { resetEnergy: true });
    lastTsRef.current = null;
  }, [initLevel, pendingDifficulty]);

  const restartRun = useCallback(() => {
    runIdRef.current =
      typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
    zombieGraceUntilRef.current = 0;
    hazardGraceUntilRef.current = 0;
    hazardRefuelGraceActiveRef.current = false;
    levelIndexRef.current = 0;
    coinsCollectedRef.current = 0;
    setVictoryAwarded(false);
    setVictoryCoins(0);
    modeRef.current = "playing";
    setMode("playing");
    initLevel(0, { resetEnergy: true });
    lastTsRef.current = null;
  }, [initLevel]);

  const setMoveRightHeld = useCallback((down: boolean) => {
    keysRef.current.runRight = down;
  }, []);

  const setMoveLeftHeld = useCallback((down: boolean) => {
    keysRef.current.runLeft = down;
  }, []);

  return (
    <div
      className="fixed inset-0 z-[72] flex flex-col bg-[#0f172a] text-kid-ink [touch-action:none]"
      role="dialog"
      aria-modal
      aria-label="Chase game"
    >
      {lobby ? (
        <div className="absolute inset-0 z-[300] flex items-center justify-center bg-black/70 p-4">
          <KidPanel className="max-w-lg space-y-4 text-center">
            <p className="text-2xl font-extrabold">Chase game</p>
            <p className="text-sm text-kid-ink/85">
              Hold <strong>Run →</strong> or Right / D to go forward, <strong>← Back</strong> or Left / A to retreat.
              The view only scrolls forward. Jump twice (Space or Jump) before you land for a double jump. Jump over gaps —
              the zombie closes in if you stall — it gets faster on later levels. Getting caught halves your coins and
              restarts the current level. In
              Obstacles, lava and spikes drain your energy and open quick refuel questions.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                className={`rounded-xl border-4 p-4 text-left transition-colors [touch-action:manipulation] ${
                  pendingDifficulty === "simple" ?
                    "border-[#0f4ecf] bg-[#dbeafe]"
                  : "border-kid-ink bg-kid-panel hover:bg-kid-surface-muted"
                }`}
                onClick={() => {
                  playSfx("tap", muted);
                  setPendingDifficulty("simple");
                }}
              >
                <p className="text-lg font-extrabold">Simple</p>
                <p className="mt-1 text-sm text-kid-ink/85">Slower zombie — no spikes or lava.</p>
              </button>
              <button
                type="button"
                className={`rounded-xl border-4 p-4 text-left transition-colors [touch-action:manipulation] ${
                  pendingDifficulty === "obstacles" ?
                    "border-[#0f4ecf] bg-[#dbeafe]"
                  : "border-kid-ink bg-kid-panel hover:bg-kid-surface-muted"
                }`}
                onClick={() => {
                  playSfx("tap", muted);
                  setPendingDifficulty("obstacles");
                }}
              >
                <p className="text-lg font-extrabold">Obstacles</p>
                <p className="mt-1 text-sm text-kid-ink/85">
                  Faster pressure — hazards trigger refuel quizzes; the zombie costs half your coins if it catches you.
                </p>
              </button>
            </div>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <KidButton type="button" variant="accent" onClick={beginFromLobby}>
                Start
              </KidButton>
              <KidButton
                type="button"
                variant="secondary"
                onClick={() => {
                  playSfx("tap", muted);
                  onClose();
                }}
              >
                Back
              </KidButton>
            </div>
          </KidPanel>
        </div>
      ) : null}

      <div className="flex shrink-0 items-center justify-between gap-2 border-b-4 border-kid-ink bg-kid-panel px-3 py-2">
        <KidButton type="button" variant="secondary" onClick={onClose}>
          Close
        </KidButton>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1 px-2 sm:flex-row sm:justify-center">
          <div className="flex w-full max-w-[200px] items-center gap-2">
            <span className="text-xs font-bold text-kid-ink">Energy</span>
            <div className="h-3 flex-1 overflow-hidden rounded border-2 border-kid-ink bg-white">
              <div
                className="h-full bg-green-500 transition-[width] duration-150"
                style={{ width: `${Math.round((energyUi / CHASE_ENERGY_MAX) * 100)}%` }}
              />
            </div>
          </div>
          <p className="text-sm font-bold whitespace-nowrap sm:ml-4">
            Level {levelUi} / {CHASE_LEVELS.length} · Coins {coinsUi}
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5 sm:gap-2">
          <KidButton
            type="button"
            variant="secondary"
            className="min-w-[3.75rem] select-none px-2 sm:min-w-[4.25rem]"
            disabled={lobby}
            onPointerDown={(e) => {
              e.preventDefault();
              setMoveLeftHeld(true);
            }}
            onPointerUp={() => setMoveLeftHeld(false)}
            onPointerLeave={() => setMoveLeftHeld(false)}
            onPointerCancel={() => setMoveLeftHeld(false)}
          >
            ←
          </KidButton>
          <KidButton
            type="button"
            variant="secondary"
            className="min-w-[3.75rem] select-none px-2 sm:min-w-[4.25rem]"
            disabled={lobby}
            onPointerDown={(e) => {
              e.preventDefault();
              setMoveRightHeld(true);
            }}
            onPointerUp={() => setMoveRightHeld(false)}
            onPointerLeave={() => setMoveRightHeld(false)}
            onPointerCancel={() => setMoveRightHeld(false)}
          >
            →
          </KidButton>
          <KidButton
            type="button"
            variant="accent"
            className="min-w-[4.5rem]"
            disabled={lobby}
            onPointerDown={(e) => {
              e.preventDefault();
              jumpQueueRef.current += 1;
            }}
          >
            Jump
          </KidButton>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 bg-slate-900 p-2">
        <canvas
          ref={canvasRef}
          className="h-full w-full rounded-lg border-4 border-kid-ink bg-[#87ceeb]"
          style={{ touchAction: "none" }}
        />
      </div>

      {mode === "refuelLoading" ? (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/55 p-4">
          <KidPanel className="max-w-md text-center">
            <p className="text-xl font-bold">Get your energy back</p>
            <p className="mt-2 text-sm text-kid-ink/80">
              You will need {REFUEL_FIRST_TRY_REQUIRED} first-try correct answers (extra tries do not count). Loading
              questions…
            </p>
          </KidPanel>
        </div>
      ) : null}

      {mode === "refuelQuiz" && refuelParsed ? (
        <div className="absolute inset-0 z-[200] overflow-y-auto bg-black/60 p-3 pb-32">
          <div className="mx-auto max-w-lg space-y-3">
            <KidPanel className="text-center">
              <p className="text-sm font-bold text-kid-ink/90">
                First-try correct: {refuelFirstTryUi} / {REFUEL_FIRST_TRY_REQUIRED}
              </p>
              <p className="mt-1 text-xs text-kid-ink/75">
                Energy refills only after {REFUEL_FIRST_TRY_REQUIRED} questions you get right on the first tap. If you
                miss, try again — then you will move on, but you may see more questions until you earn two first-try
                wins.
              </p>
            </KidPanel>
            <McQuizView
              key={refuelQIndex}
              parsed={refuelParsed}
              muted={muted}
              passed={refuelPassed}
              snappyCorrect
              onPass={() => {
                setRefuelPassed(true);
                playSfx("correct", muted);
              }}
              onWrong={() => {
                refuelWrongThisQuestionRef.current = true;
                playSfx("wrong", muted);
              }}
              onNext={() => {
                if (refuelPassedRef.current) {
                  advanceRefuelAfterQuestionCorrect();
                }
              }}
              onBack={() => {}}
              showBack={false}
            />
          </div>
        </div>
      ) : null}

      {mode === "victory" ? (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/55 p-4">
          <KidPanel className="max-w-md text-center">
            <p className="text-2xl font-extrabold">You made it!</p>
            <p className="mt-3 text-lg">You cleared all {CHASE_LEVELS.length} levels.</p>
            <p className="mt-2 text-base font-semibold">Coins collected: {victoryCoins}</p>
            <p className="mt-1 text-sm text-kid-ink/80">Gold and XP were added to your profile.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <KidButton type="button" variant="accent" onClick={onClose}>
                Done
              </KidButton>
              <KidButton type="button" variant="secondary" onClick={restartRun}>
                Play again
              </KidButton>
            </div>
          </KidPanel>
        </div>
      ) : null}
    </div>
  );
}
