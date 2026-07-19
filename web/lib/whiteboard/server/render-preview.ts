import "server-only";

import sharp from "sharp";
import type { BoardBackground, SerializedBoardDocument } from "@/lib/whiteboard/domain";
import { boardToSvgString } from "@/lib/whiteboard/svg-export";

export async function renderBoardPng(input: {
  document: SerializedBoardDocument;
  background?: BoardBackground | null;
  maxWidth?: number;
}): Promise<Buffer> {
  const svg = boardToSvgString({
    elements: input.document.elements,
    background: input.background,
    annotations: input.document.annotations,
  });
  const maxWidth = input.maxWidth ?? 480;
  return sharp(Buffer.from(svg))
    .resize({ width: maxWidth, withoutEnlargement: true })
    .png()
    .toBuffer();
}

export function pngToDataUrl(buffer: Buffer): string {
  return `data:image/png;base64,${buffer.toString("base64")}`;
}
