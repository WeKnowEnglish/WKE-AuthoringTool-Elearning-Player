import { parseBoardMap, validateBoardMap } from "@/lib/board-game/map/schema";
import { createCustomMapId } from "@/lib/board-game/map/library/storage";
import type { BoardMap } from "@/lib/board-game/map/types";

export type ExportedMapFile = {
  exportVersion: 1;
  exportedAt: string;
  title: string;
  map: BoardMap;
};

export function serializeMapExport(map: BoardMap, title?: string): string {
  const payload: ExportedMapFile = {
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    title: title?.trim() || map.title,
    map,
  };
  return JSON.stringify(payload, null, 2);
}

export function downloadMapExport(map: BoardMap, filename?: string): void {
  const blob = new Blob([serializeMapExport(map)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const safeName = (filename ?? map.title).replace(/[^\w\-]+/g, "-").replace(/^-+|-+$/g, "") || "board-map";
  anchor.href = url;
  anchor.download = `${safeName}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export type ImportMapResult =
  | { ok: true; map: BoardMap; title: string }
  | { ok: false; error: string };

export function parseMapImport(raw: string): ImportMapResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "File is not valid JSON." };
  }

  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "Import file must be a JSON object." };
  }

  const record = parsed as Partial<ExportedMapFile> & { map?: unknown };
  const mapCandidate = record.map ?? parsed;
  const validated = validateBoardMap(mapCandidate);
  if (!validated) {
    return { ok: false, error: "Map data failed validation." };
  }

  const title =
    typeof record.title === "string" && record.title.trim().length > 0 ?
      record.title.trim()
    : validated.title;

  return { ok: true, map: validated, title };
}

/** Assign a fresh custom id when importing. */
export function prepareImportedMap(map: BoardMap, title: string): BoardMap {
  return {
    ...map,
    id: createCustomMapId(),
    title: title.trim() || map.title,
  };
}

export function assertMapImportRoundTrip(map: BoardMap): BoardMap {
  return parseBoardMap(JSON.parse(serializeMapExport(map)).map);
}
