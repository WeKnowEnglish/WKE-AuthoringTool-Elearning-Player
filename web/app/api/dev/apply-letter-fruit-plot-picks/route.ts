import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import {
  normalizeLetterFruitPlotPicksPayload,
  patchLetterFruitPlotPresets,
  type LetterFruitPlotPicksPayload,
} from "@/lib/topdown/letter-fruit-plot-picks-sync";

const PRESETS_REPO_PATH = "lib/topdown/letter-fruit-plot-presets.ts";
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

  let payload: LetterFruitPlotPicksPayload;
  try {
    payload = (await request.json()) as LetterFruitPlotPicksPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const picks = normalizeLetterFruitPlotPicksPayload(payload);

    writeRepoFile(
      PRESETS_FILE_PATH,
      patchLetterFruitPlotPresets(readRepoFile(PRESETS_FILE_PATH), picks),
    );

    return NextResponse.json({
      ok: true,
      updated: [PRESETS_REPO_PATH],
      presetCount: picks.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to apply letter fruit plot picks";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
