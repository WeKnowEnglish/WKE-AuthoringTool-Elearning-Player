import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import {
  normalizeWkePathPicksPayload,
  patchWkePathTilePresets,
  patchWkeSpriteAtlasPathAssets,
  type WkePathPicksPayload,
} from "@/lib/topdown/wke-path-picks-sync";

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

  let payload: WkePathPicksPayload;
  try {
    payload = (await request.json()) as WkePathPicksPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const picks = normalizeWkePathPicksPayload(payload);
    const atlasPath = "lib/topdown/wke-sprite-atlas.ts";
    const presetsPath = "lib/topdown/wke-path-tile-presets.ts";

    writeRepoFile(atlasPath, patchWkeSpriteAtlasPathAssets(readRepoFile(atlasPath), picks));
    writeRepoFile(presetsPath, patchWkePathTilePresets(readRepoFile(presetsPath), picks));

    return NextResponse.json({
      ok: true,
      updated: [atlasPath, presetsPath],
      tileCount: picks.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to apply path picks";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
