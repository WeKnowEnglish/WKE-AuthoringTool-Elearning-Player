import type { BoardMap } from "@/lib/board-game/map/types";

export type CustomMapRecord = {
  id: string;
  title: string;
  map: BoardMap;
  updatedAt: string;
  sourcePresetId?: string;
};

export type CustomMapLibrary = {
  schemaVersion: 1;
  maps: Record<string, CustomMapRecord>;
};
