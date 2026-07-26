import JSZip from "jszip";

import {
  parseGamesListenAndChooseLessonPlayerPack,
  type GamesListenAndChooseLessonPlayerPack,
} from "@/lib/games-listen-choose/parse-games-pack";

export type ImportedGamesListenAndChoosePack = {
  pack: GamesListenAndChooseLessonPlayerPack;
  /** Object URLs created for zip assets — call revoke() when unloading. */
  objectUrls: string[];
  sourceName: string;
  mode: "zip" | "json";
};

function isZipFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".zip") ||
    name.endsWith(".lessonplayer.zip") ||
    file.type === "application/zip" ||
    file.type === "application/x-zip-compressed"
  );
}

function collectAssetBlobs(zip: JSZip): Map<string, JSZip.JSZipObject> {
  const map = new Map<string, JSZip.JSZipObject>();
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const normalized = path.replace(/\\/g, "/");
    if (!normalized.startsWith("assets/")) continue;
    const filename = normalized.slice("assets/".length);
    if (!filename || filename.includes("/")) continue;
    map.set(filename, entry);
    map.set(normalized, entry);
  }
  return map;
}

async function remapUrlToObjectUrl(
  src: string,
  assetEntries: Map<string, JSZip.JSZipObject>,
  objectUrls: string[],
  label: string,
): Promise<string> {
  if (src.startsWith("data:") || src.startsWith("blob:")) return src;
  const filename = src.split("/").pop()?.split("?")[0] ?? "";
  if (!filename) return src;
  const entry = assetEntries.get(filename) || assetEntries.get(`assets/${filename}`) || null;
  if (!entry) {
    // Already-remote or already-on-disk URLs — leave as-is (cloud studio_media, pilots).
    if (src.startsWith("/") || /^https?:\/\//i.test(src)) return src;
    throw new Error(`Zip is missing asset file for ${label} (expected assets/${filename}).`);
  }
  const blob = await entry.async("blob");
  const url = URL.createObjectURL(blob);
  objectUrls.push(url);
  return url;
}

/**
 * Import a Studio Quiz listen-and-choose pack (.json or .lessonplayer.zip).
 * Zip assets are remapped to blob: URLs so the pilot can play without copying into /public.
 */
export async function importGamesListenAndChoosePack(
  file: File,
): Promise<ImportedGamesListenAndChoosePack> {
  if (isZipFile(file)) {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const jsonEntry = Object.values(zip.files).find((entry) => {
      if (entry.dir) return false;
      const name = entry.name.replace(/\\/g, "/").toLowerCase();
      return (
        name.endsWith(".games-listen.lessonplayer.json") ||
        (name.endsWith(".json") && !name.endsWith("package.json"))
      );
    });
    if (!jsonEntry) {
      throw new Error("Zip is missing a .games-listen.lessonplayer.json pack file.");
    }
    const pack = structuredClone(
      parseGamesListenAndChooseLessonPlayerPack(
        JSON.parse(await jsonEntry.async("string")) as unknown,
      ),
    );
    const assetEntries = collectAssetBlobs(zip);
    const objectUrls: string[] = [];

    for (const [screenIndex, screen] of pack.screens.entries()) {
      for (const choice of screen.choices) {
        choice.image_url = await remapUrlToObjectUrl(
          choice.image_url,
          assetEntries,
          objectUrls,
          `screen ${screenIndex + 1} choice ${choice.id}`,
        );
      }
      if (screen.prompt_audio_url) {
        screen.prompt_audio_url = await remapUrlToObjectUrl(
          screen.prompt_audio_url,
          assetEntries,
          objectUrls,
          `screen ${screenIndex + 1} dialog audio`,
        );
      }
    }

    return {
      pack,
      objectUrls,
      sourceName: file.name,
      mode: "zip",
    };
  }

  const pack = parseGamesListenAndChooseLessonPlayerPack(JSON.parse(await file.text()));
  return {
    pack,
    objectUrls: [],
    sourceName: file.name,
    mode: "json",
  };
}

export function revokeImportedObjectUrls(urls: string[]) {
  for (const url of urls) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  }
}
