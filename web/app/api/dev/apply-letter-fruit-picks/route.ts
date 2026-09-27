import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import {
  normalizeLetterFruitPicksPayload,
  patchLetterFruitAtlasAssets,
  patchLetterFruitOverlayPresets,
  type LetterFruitPicksPayload,
} from "@/lib/topdown/letter-fruit-picks-sync";

const ATLAS_REPO_PATH = "lib/topdown/letter-fruit-atlas.ts";
const PRESETS_REPO_PATH = "lib/topdown/letter-fruit-overlay-presets.ts";
const ATLAS_FILE_PATH = join(
  /* turbopackIgnore: true */ process.cwd(),
  ATLAS_REPO_PATH,
);
const PRESETS_FILE_PATH = join(
  /* turbopackIgnore: true */ process.cwd(),
  PRESETS_REPO_PATH,
);

function readRepoFile(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

function writeRepoFile(filePath: string, contents: string): void {
  writeFileSync(filePath, contents, "utf8");
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

    writeRepoFile(
      ATLAS_FILE_PATH,
      patchLetterFruitAtlasAssets(readRepoFile(ATLAS_FILE_PATH), picks),
    );
    writeRepoFile(
      PRESETS_FILE_PATH,
      patchLetterFruitOverlayPresets(readRepoFile(PRESETS_FILE_PATH), picks),
    );

    return NextResponse.json({
      ok: true,
      updated: [ATLAS_REPO_PATH, PRESETS_REPO_PATH],
      tileCount: picks.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to apply letter fruit picks";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
