import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import {
  normalizeLetterFruitPicksPayload,
  patchLetterFruitAtlasAssets,
  patchLetterFruitOverlayPresets,
  type LetterFruitPicksPayload,
} from "@/lib/topdown/letter-fruit-picks-sync";

const WEB_ROOT = process.cwd();

function readRepoFile(relativePath: string): string {
  return readFileSync(join(WEB_ROOT, relativePath), "utf8");
}

function writeRepoFile(relativePath: string, contents: string): void {
  writeFileSync(join(WEB_ROOT, relativePath), contents, "utf8");
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  let payload: LetterFruitPicksPayload;
  try {
    payload = (await request.json()) as LetterFruitPicksPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const picks = normalizeLetterFruitPicksPayload(payload);
    const atlasPath = "lib/topdown/letter-fruit-atlas.ts";
    const presetsPath = "lib/topdown/letter-fruit-overlay-presets.ts";

    writeRepoFile(atlasPath, patchLetterFruitAtlasAssets(readRepoFile(atlasPath), picks));
    writeRepoFile(
      presetsPath,
      patchLetterFruitOverlayPresets(readRepoFile(presetsPath), picks),
    );

    return NextResponse.json({
      ok: true,
      updated: [atlasPath, presetsPath],
      tileCount: picks.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to apply letter fruit picks";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
