import JSZip from "jszip";

import type { WkeActivityV2 } from "@/lib/wke-activity/types";
import { parseWkeActivity } from "@/lib/wke-activity/schema";

export type ImportedLessonPlayerPack = {
  document: WkeActivityV2;
  /** Object URLs created for zip assets — call revoke() when remounting/unloading. */
  objectUrls: string[];
  sourceName: string;
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

/**
 * Import a Studio Lesson Player pack (.wkeactivity.json or .lessonplayer.zip).
 * Zip assets are remapped to blob: object URLs so the pilot can play without copying into /public.
 */
export async function importLessonPlayerHotspotPack(file: File): Promise<ImportedLessonPlayerPack> {
  if (isZipFile(file)) {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const jsonEntry = Object.values(zip.files).find((entry) => {
      if (entry.dir) return false;
      const name = entry.name.replace(/\\/g, "/").toLowerCase();
      return name.endsWith(".wkeactivity.json") || name.endsWith(".json");
    });
    if (!jsonEntry) {
      throw new Error("Zip is missing a .wkeactivity.json activity file.");
    }
    const raw = JSON.parse(await jsonEntry.async("string")) as unknown;
    const document = structuredClone(parseWkeActivity(raw));
    const assetEntries = collectAssetBlobs(zip);
    const objectUrls: string[] = [];

    for (const asset of document.assets) {
      if (asset.kind !== "image") continue;
      if (asset.src.startsWith("data:") || asset.src.startsWith("blob:")) continue;

      const filename = asset.src.split("/").pop()?.split("?")[0] ?? "";
      const entry =
        assetEntries.get(filename) ||
        assetEntries.get(`assets/${filename}`) ||
        null;
      if (!entry) {
        throw new Error(
          `Zip is missing asset file for "${asset.id}" (expected assets/${filename}).`,
        );
      }
      const blob = await entry.async("blob");
      const typed =
        asset.mimeType && !blob.type
          ? new Blob([blob], { type: asset.mimeType })
          : blob;
      const url = URL.createObjectURL(typed);
      objectUrls.push(url);
      asset.src = url;
    }

    return {
      document,
      objectUrls,
      sourceName: file.name,
    };
  }

  const text = await file.text();
  const document = parseWkeActivity(JSON.parse(text) as unknown);
  return {
    document,
    objectUrls: [],
    sourceName: file.name,
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
