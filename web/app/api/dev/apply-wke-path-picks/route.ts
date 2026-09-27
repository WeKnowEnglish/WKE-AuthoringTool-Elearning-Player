import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import {
  normalizeWkePathPicksPayload,
  patchWkePathTilePresets,
  patchWkeSpriteAtlasPathAssets,
  type WkePathPicksPayload,
} from "@/lib/topdown/wke-path-picks-sync";

const ATLAS_REPO_PATH = "lib/topdown/wke-sprite-atlas.ts";
const PRESETS_REPO_PATH = "lib/topdown/wke-path-tile-presets.ts";
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

  let payload: WkePathPicksPayload;
  try {
    payload = (await request.json()) as WkePathPicksPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const picks = normalizeWkePathPicksPayload(payload);

    writeRepoFile(
      ATLAS_FILE_PATH,
      patchWkeSpriteAtlasPathAssets(readRepoFile(ATLAS_FILE_PATH), picks),
    );
    writeRepoFile(
      PRESETS_FILE_PATH,
      patchWkePathTilePresets(readRepoFile(PRESETS_FILE_PATH), picks),
    );

    return NextResponse.json({
      ok: true,
      updated: [ATLAS_REPO_PATH, PRESETS_REPO_PATH],
      tileCount: picks.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to apply path picks";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
