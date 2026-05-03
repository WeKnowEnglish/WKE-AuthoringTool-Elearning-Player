"use client";

export type ClientImageHashes = {
  sha256Hex: string;
  dHashHex: string | null;
};

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function isHex(value: string, expectedLen: number): boolean {
  return value.length === expectedLen && /^[0-9a-f]+$/i.test(value);
}

async function digestSha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return bytesToHex(new Uint8Array(digest));
}

async function readImageBitmap(file: Blob): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(file);
  } catch {
    return null;
  }
}

function sampleGray9x8(bitmap: ImageBitmap): number[] {
  const canvas = document.createElement("canvas");
  canvas.width = 9;
  canvas.height = 8;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  ctx.drawImage(bitmap, 0, 0, 9, 8);
  const data = ctx.getImageData(0, 0, 9, 8).data;
  const out: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    // Match server-side grayscale behavior closely enough for duplicate scan.
    out.push((r * 299 + g * 587 + b * 114) / 1000);
  }
  return out;
}

function gray9x8ToDHashHex(gray: number[]): string | null {
  if (gray.length !== 72) return null;
  let bits = "";
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const row = y * 9;
      const left = gray[row + x] ?? 0;
      const right = gray[row + x + 1] ?? 0;
      bits += left > right ? "1" : "0";
    }
  }
  const value = BigInt(`0b${bits}`).toString(16).padStart(16, "0");
  return isHex(value, 16) ? value : null;
}

export async function computeClientImageHashes(file: File): Promise<ClientImageHashes | null> {
  if (!file.type.startsWith("image/")) return null;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const sha256Hex = await digestSha256Hex(bytes);
  if (!isHex(sha256Hex, 64)) return null;

  let dHashHex: string | null = null;
  const bitmap = await readImageBitmap(file);
  if (bitmap) {
    try {
      dHashHex = gray9x8ToDHashHex(sampleGray9x8(bitmap));
    } finally {
      bitmap.close();
    }
  }
  return { sha256Hex, dHashHex };
}
