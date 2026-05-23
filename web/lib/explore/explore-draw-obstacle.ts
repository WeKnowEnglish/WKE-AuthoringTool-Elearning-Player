/** Procedural gate obstacle (placeholder until sprite art). */
export function drawExploreObstacle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  kind: "spike" | "lava",
) {
  if (kind === "lava") {
    ctx.fillStyle = "#b91c1c";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#f97316";
    ctx.fillRect(x + 2, y + 2, w - 4, Math.max(2, h - 6));
    ctx.strokeStyle = "#7f1d1d";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    return;
  }
  ctx.fillStyle = "#334155";
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x + w / 2, y);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 2;
  ctx.stroke();
}
