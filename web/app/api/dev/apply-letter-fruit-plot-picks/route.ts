import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import {
  normalizeLetterFruitPlotPicksPayload,
  patchLetterFruitPlotPresets,
  type LetterFruitPlotPicksPayload,
} from "@/lib/topdown/letter-fruit-plot-picks-sync";

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

  let payload: LetterFruitPlotPicksPayload;
  try {
    payload = (await request.json()) as LetterFruitPlotPicksPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const picks = normalizeLetterFruitPlotPicksPayload(payload);
    const presetsPath = "lib/topdown/letter-fruit-plot-presets.ts";

    writeRepoFile(presetsPath, patchLetterFruitPlotPresets(readRepoFile(presetsPath), picks));

    return NextResponse.json({
      ok: true,
      updated: [presetsPath],
      presetCount: picks.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to apply letter fruit plot picks";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
