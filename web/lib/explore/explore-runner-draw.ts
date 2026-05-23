/**
 * Canvas-drawn explore runner (placeholder until custom sprite art).
 * Pixel-style character with run cycle, dodge jump, and stumble poses.
 */

export const EXPLORE_RUNNER_DRAW_W = 48;
export const EXPLORE_RUNNER_DRAW_H = 56;

export type ExploreRunnerPose =
  | { kind: "run"; frame: number }
  | { kind: "jump"; progress: number }
  | { kind: "stumble" }
  | { kind: "alert"; bob: number };

/** Run cycle length (frames). */
export const EXPLORE_RUN_FRAME_COUNT = 4;

/** Ms per run animation frame while moving. */
export const EXPLORE_RUN_FRAME_MS = 90;

/** Dodge jump arc: progress 0..1 over gate resolve. */
export function exploreDodgeJumpOffset(progress: number): { dx: number; dy: number } {
  const t = Math.min(1, Math.max(0, progress));
  const dy = -Math.sin(t * Math.PI) * 58;
  const dx = t * 44;
  return { dx, dy };
}

function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

/** Draw pixel runner anchored bottom-left at (x, y) with feet on ground. */
export function drawExploreRunner(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  pose: ExploreRunnerPose,
) {
  const scale = EXPLORE_RUNNER_DRAW_W / 32;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const hair = "#6B4423";
  const skin = "#DEB887";
  const shirt = "#2563eb";
  const pants = "#1e293b";
  const shoe = "#0f172a";

  let legL = { x: 10, y: 28, w: 5, h: 10 };
  let legR = { x: 17, y: 28, w: 5, h: 10 };
  let bodyY = 16;
  let armOffset = 0;

  if (pose.kind === "run") {
    const f = pose.frame % EXPLORE_RUN_FRAME_COUNT;
    if (f === 0) {
      legL = { x: 8, y: 30, w: 6, h: 8 };
      legR = { x: 18, y: 26, w: 5, h: 12 };
      armOffset = 2;
    } else if (f === 1) {
      legL = { x: 10, y: 28, w: 5, h: 10 };
      legR = { x: 17, y: 28, w: 5, h: 10 };
      bodyY = 15;
    } else if (f === 2) {
      legL = { x: 9, y: 26, w: 5, h: 12 };
      legR = { x: 18, y: 30, w: 6, h: 8 };
      armOffset = -2;
    } else {
      legL = { x: 10, y: 28, w: 5, h: 10 };
      legR = { x: 17, y: 28, w: 5, h: 10 };
      bodyY = 15;
    }
  } else if (pose.kind === "jump") {
    const tuck = pose.progress;
    legL = { x: 9, y: 30 - tuck * 4, w: 6, h: 8 - tuck * 2 };
    legR = { x: 17, y: 30 - tuck * 4, w: 6, h: 8 - tuck * 2 };
    bodyY = 14 - tuck * 3;
    armOffset = -4;
  } else if (pose.kind === "stumble") {
    legL = { x: 6, y: 32, w: 8, h: 6 };
    legR = { x: 16, y: 31, w: 7, h: 7 };
    bodyY = 18;
    ctx.translate(4, 2);
    ctx.rotate(0.12);
  } else if (pose.kind === "alert") {
    const bob = pose.bob;
    bodyY = 16 + bob;
    legL = { x: 9, y: 28 + bob, w: 5, h: 8 };
    legR = { x: 18, y: 28 + bob, w: 5, h: 8 };
    armOffset = 3;
  }

  px(ctx, legL.x, legL.y, legL.w, legL.h, pants);
  px(ctx, legR.x, legR.y, legR.w, legR.h, pants);
  px(ctx, legL.x, legL.y + legL.h - 2, legL.w, 2, shoe);
  px(ctx, legR.x, legR.y + legR.h - 2, legR.w, 2, shoe);

  px(ctx, 8, bodyY, 16, 12, shirt);
  if (armOffset !== 0) {
    px(ctx, 6, bodyY + 4 + armOffset, 4, 8, shirt);
    px(ctx, 22, bodyY + 6 - armOffset, 4, 6, shirt);
  }

  px(ctx, 10, 4, 12, 4, hair);
  px(ctx, 10, 8, 12, 8, skin);
  px(ctx, 12, 12, 2, 2, "#0f172a");
  px(ctx, 18, 12, 2, 2, "#0f172a");

  ctx.restore();
}

/** Speed lines behind the runner for motion / urgency (world coordinates). */
export function drawExploreSpeedLines(
  ctx: CanvasRenderingContext2D,
  playerX: number,
  playerY: number,
  intensity: number,
  nowMs: number,
) {
  if (intensity <= 0) return;
  const baseY = playerY + EXPLORE_RUNNER_DRAW_H * 0.55;
  const count = Math.floor(3 + intensity * 4);
  ctx.save();
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.25 + intensity * 0.2})`;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  for (let i = 0; i < count; i++) {
    const phase = (nowMs / 80 + i * 1.7) % 1;
    const len = 12 + intensity * 20 * (1 - phase);
    const sx = playerX - 20 - i * 14 - phase * 30;
    const sy = baseY - 8 + (i % 3) * 10;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx - len, sy);
    ctx.stroke();
  }
  ctx.restore();
}

/** Ground dust puffs at feet while running (world coordinates). */
export function drawExploreRunDust(
  ctx: CanvasRenderingContext2D,
  playerX: number,
  playerY: number,
  frame: number,
) {
  const fx = playerX + 4;
  const fy = playerY + EXPLORE_RUNNER_DRAW_H - 4;
  ctx.fillStyle = "rgba(120, 113, 108, 0.45)";
  const puff = frame % 2 === 0;
  if (puff) {
    ctx.beginPath();
    ctx.ellipse(fx, fy, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(fx + 14, fy + 2, 4, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
