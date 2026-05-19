import { STICKER_LIBRARY } from "@/lib/progress/sticker-library";
import type { PlacedSticker } from "@/lib/student-hub/sticker-book-types";
import { imagePercentToContainerPoint } from "@/lib/student-hub/sticker-scene-geometry";

const EXPORT_WIDTH = 1200;
const EXPORT_HEIGHT = 900;
const BASE_EMOJI_PX = 72;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load background image"));
    img.src = url;
  });
}

/** Letterbox fill behind `contain`-fitted image (matches kid-surface). */
const STAGE_LETTERBOX = "#ebe4d6";

function drawContainBackground(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number,
) {
  ctx.fillStyle = STAGE_LETTERBOX;
  ctx.fillRect(0, 0, width, height);
  const scale = Math.min(width / img.width, height / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const x = (width - w) / 2;
  const y = (height - h) / 2;
  ctx.drawImage(img, x, y, w, h);
}

/**
 * Renders background + emoji stickers to a PNG blob for download.
 */
export async function exportStickerSceneToPng(
  backgroundUrl: string,
  placements: readonly PlacedSticker[],
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_WIDTH;
  canvas.height = EXPORT_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const bg = await loadImage(backgroundUrl);
  drawContainBackground(ctx, bg, EXPORT_WIDTH, EXPORT_HEIGHT);

  for (const p of placements) {
    const def = STICKER_LIBRARY.find((s) => s.id === p.stickerId);
    if (!def) continue;
    const fontSize = BASE_EMOJI_PX * p.scale;
    ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const { x, y } = imagePercentToContainerPoint(
      p.xPercent,
      p.yPercent,
      EXPORT_WIDTH,
      EXPORT_HEIGHT,
      bg.naturalWidth,
      bg.naturalHeight,
    );
    ctx.fillText(def.emoji, x, y);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Export failed"))),
      "image/png",
    );
  });
}

export function downloadStickerSceneBlob(blob: Blob, filename = "my-sticker-scene.png") {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
