"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  EXPLORE_DESIGN_VIEW_H,
  EXPLORE_GATE_RESOLVE_MS,
  EXPLORE_GROUND_Y,
  EXPLORE_PLAYER_H,
  EXPLORE_PLAYER_W,
  type ExploreRunMode,
  type ExploreRunState,
} from "@/lib/explore/explore-run-engine";
import { drawExploreObstacle } from "@/lib/explore/explore-draw-obstacle";
import type { ExploreTemplate } from "@/lib/explore/explore-templates";
import {
  drawExploreRunDust,
  drawExploreRunner,
  drawExploreSpeedLines,
  exploreDodgeJumpOffset,
  EXPLORE_RUN_FRAME_COUNT,
  EXPLORE_RUN_FRAME_MS,
  type ExploreRunnerPose,
} from "@/lib/explore/explore-runner-draw";

/** Runner horizontal position as fraction of viewport width (fixed treadmill). */
const RUNNER_SCREEN_FRAC = 0.28;
const OBSTACLE_W = 36;
const OBSTACLE_H = 40;

type Props = {
  template: ExploreTemplate;
  mode: ExploreRunMode;
  state: ExploreRunState;
  scrollSpeedPxPerSec: number;
  obstacleKind?: "spike" | "lava";
  backgroundUrl?: string;
  className?: string;
};

export function ExploreRunLoopCanvas({
  template,
  mode,
  state,
  scrollSpeedPxPerSec,
  obstacleKind = "spike",
  backgroundUrl,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef(state);
  const modeRef = useRef(mode);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const cosmeticScrollRef = useRef(0);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    if (!backgroundUrl?.trim() || backgroundUrl.includes("placehold.co")) {
      bgImageRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = backgroundUrl;
    img.onload = () => {
      bgImageRef.current = img;
    };
  }, [backgroundUrl]);

  const drawFrame = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, nowMs: number, dtSec: number) => {
      const st = stateRef.current;
      const currentMode = modeRef.current;
      const loop = template.runLoop;
      const scale = h / EXPLORE_DESIGN_VIEW_H;
      const loopWidth = loop.loopWidthPx;

      const isObstacleClip = currentMode === "gateResolve";
      const isQuizClip = currentMode === "gateQuiz";
      const isEncounterClip = currentMode === "encounter" || currentMode === "complete";

      if (isQuizClip || isObstacleClip) {
        cosmeticScrollRef.current += scrollSpeedPxPerSec * Math.max(0, dtSec);
      } else if (currentMode === "running") {
        cosmeticScrollRef.current = st.playerX;
      } else if (isEncounterClip) {
        cosmeticScrollRef.current += scrollSpeedPxPerSec * 0.25 * Math.max(0, dtSec);
      }

      const scrollX =
        isQuizClip || isObstacleClip || isEncounterClip ?
          cosmeticScrollRef.current % loopWidth
        : st.playerX % loopWidth;

      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, loop.skyTop);
      sky.addColorStop(1, loop.skyBottom);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      const bg = bgImageRef.current;
      if (bg?.complete && bg.naturalWidth > 0) {
        const parallaxX = -(scrollX * scale * 0.08) % w;
        const drawH = h * 0.45;
        const aspect = bg.naturalWidth / bg.naturalHeight;
        const drawW = drawH * aspect;
        ctx.drawImage(bg, parallaxX, 0, drawW, drawH);
        ctx.drawImage(bg, parallaxX + drawW, 0, drawW, drawH);
      }

      ctx.save();
      ctx.scale(scale, scale);
      const designW = w / scale;
      const runnerScreenX = designW * RUNNER_SCREEN_FRAC;
      const groundH = EXPLORE_DESIGN_VIEW_H - EXPLORE_GROUND_Y;

      for (const layer of loop.layers) {
        const offset = (scrollX * layer.parallax) % loopWidth;
        const hillH = EXPLORE_DESIGN_VIEW_H * layer.heightFrac;
        ctx.fillStyle = layer.fill ?? "#86efac";
        for (let tile = -1; tile <= Math.ceil(designW / loopWidth) + 1; tile++) {
          const baseX = tile * loopWidth - offset;
          for (let i = 0; i < 3; i++) {
            const hx = baseX + i * (loopWidth / 3) + 80;
            ctx.beginPath();
            ctx.ellipse(
              hx + 120,
              EXPLORE_GROUND_Y - hillH * 0.5,
              140,
              hillH * 0.45,
              0,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        }
      }

      const groundOffset = scrollX % loopWidth;
      ctx.fillStyle = loop.ground;
      for (let tile = -1; tile <= Math.ceil(designW / loopWidth) + 2; tile++) {
        ctx.fillRect(
          tile * loopWidth - groundOffset,
          EXPLORE_GROUND_Y,
          loopWidth + 2,
          groundH,
        );
      }
      ctx.fillStyle = loop.groundEdge;
      for (let tile = -1; tile <= Math.ceil(designW / loopWidth) + 2; tile++) {
        ctx.fillRect(tile * loopWidth - groundOffset, EXPLORE_GROUND_Y, loopWidth + 2, 12);
      }

      const py = st.playerY;
      let px = runnerScreenX;
      let drawPy = py;
      let pose: ExploreRunnerPose;

      if (isObstacleClip) {
        const obstacleX = runnerScreenX + EXPLORE_PLAYER_W + 52;
        const obstacleY = EXPLORE_GROUND_Y - OBSTACLE_H;
        drawExploreObstacle(ctx, obstacleX, obstacleY, OBSTACLE_W, OBSTACLE_H, obstacleKind);

        if (st.gateOutcome === "dodge" && st.resolveStartedAtMs != null) {
          const progress = Math.min(
            1,
            (nowMs - st.resolveStartedAtMs) / EXPLORE_GATE_RESOLVE_MS,
          );
          const { dx, dy } = exploreDodgeJumpOffset(progress);
          pose = { kind: "jump", progress };
          px += dx;
          drawPy += dy;
        } else if (st.gateOutcome === "hit") {
          pose = { kind: "stumble" };
        } else {
          pose = { kind: "alert", bob: 0 };
        }
        drawExploreSpeedLines(ctx, px, drawPy, 1, nowMs);
      } else if (isQuizClip) {
        const bob = Math.sin(nowMs / 110) * 0.18;
        pose = { kind: "alert", bob };
        drawExploreSpeedLines(ctx, px, py, 1, nowMs);
        drawExploreRunDust(
          ctx,
          px,
          py,
          Math.floor(nowMs / EXPLORE_RUN_FRAME_MS) % EXPLORE_RUN_FRAME_COUNT,
        );
      } else if (isEncounterClip) {
        pose = { kind: "run", frame: 0 };
      } else {
        const runFrame = Math.floor(nowMs / EXPLORE_RUN_FRAME_MS) % EXPLORE_RUN_FRAME_COUNT;
        const moving = st.scrollSpeedMul >= 0.9;
        pose = { kind: "run", frame: runFrame };
        if (moving) {
          drawExploreSpeedLines(ctx, px, py, st.scrollSpeedMul, nowMs);
          drawExploreRunDust(ctx, px, py, runFrame);
        }
      }

      drawExploreRunner(ctx, px, drawPy, pose);

      if (st.hitFlashUntilMs != null && nowMs < st.hitFlashUntilMs) {
        ctx.fillStyle = "rgba(239, 68, 68, 0.35)";
        ctx.fillRect(px - 8, drawPy - 8, EXPLORE_PLAYER_W + 16, EXPLORE_PLAYER_H + 16);
      }

      ctx.restore();
    },
    [template, obstacleKind, scrollSpeedPxPerSec],
  );

  const syncCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return { w: 0, h: 0 };
    const rect = parent.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    return { w, h };
  }, []);

  const lastPaintRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let raf: number;
    const paint = (ts: number) => {
      const last = lastPaintRef.current;
      lastPaintRef.current = ts;
      const dtSec = last == null ? 0 : Math.min(0.05, (ts - last) / 1000);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const { w, h } = syncCanvasSize();
        if (w >= 16 && h >= 16) {
          const dpr = Math.min(2, window.devicePixelRatio || 1);
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          drawFrame(ctx, w, h, ts, dtSec);
        }
      }
      raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);
    const ro = new ResizeObserver(() => syncCanvasSize());
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      lastPaintRef.current = null;
    };
  }, [drawFrame, syncCanvasSize]);

  useEffect(() => {
    if (mode === "gateQuiz") {
      cosmeticScrollRef.current = state.playerX;
    }
  }, [mode, state.activeGateIndex]);

  return (
    <canvas
      ref={canvasRef}
      className={className ?? "block h-full w-full touch-none"}
      aria-label={
        mode === "gateResolve" ? "Obstacle encounter"
        : mode === "gateQuiz" ?
          "Explore run — spell in the clouds"
        : "Explore run loop"
      }
      role="img"
    />
  );
}
