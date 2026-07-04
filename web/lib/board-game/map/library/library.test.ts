import { describe, expect, it, beforeEach, vi } from "vitest";
import { getMapById } from "@/lib/board-game/map/default-maps";
import {
  addConnectionByPathIndex,
  cloneMapAsCustom,
  createMapFromOptions,
  updateSpace,
} from "@/lib/board-game/map/library/map-mutations";
import {
  deleteCustomMap,
  listCustomMaps,
  readCustomMap,
  saveCustomMap,
} from "@/lib/board-game/map/library/storage";
import { MAPS_STORAGE_KEY } from "@/lib/board-game/constants";

describe("custom map library", () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    const mockStorage = {
      getItem(key: string) {
        return store[key] ?? null;
      },
      setItem(key: string, value: string) {
        store[key] = value;
      },
      removeItem(key: string) {
        delete store[key];
      },
    };
    vi.stubGlobal("window", { localStorage: mockStorage });
    vi.stubGlobal("localStorage", mockStorage);
  });

  it("saves and loads a custom map", () => {
    const map = createMapFromOptions({
      title: "Friday Class",
      theme: "jungle",
      layoutTemplate: "snake",
      boardLength: 12,
      id: "custom-test-1",
    });

    saveCustomMap({ id: map.id, title: map.title, map });
    const loaded = readCustomMap(map.id);
    expect(loaded?.title).toBe("Friday Class");
    expect(loaded?.map.pathOrder.length).toBe(13);
  });

  it("resolves custom maps through getMapById", () => {
    const map = createMapFromOptions({
      title: "Custom",
      theme: "space",
      layoutTemplate: "spiral",
      boardLength: 10,
      id: "custom-test-2",
    });
    saveCustomMap({ id: map.id, title: map.title, map });
    expect(getMapById(map.id)?.title).toBe("Custom");
  });

  it("lists custom maps sorted by title", () => {
    saveCustomMap({
      id: "custom-a",
      title: "Zebra Trail",
      map: createMapFromOptions({ title: "Z", theme: "ocean", layoutTemplate: "island", boardLength: 12, id: "custom-a" }),
    });
    saveCustomMap({
      id: "custom-b",
      title: "Alpha Trail",
      map: createMapFromOptions({ title: "A", theme: "ocean", layoutTemplate: "island", boardLength: 12, id: "custom-b" }),
    });
    expect(listCustomMaps().map((entry) => entry.title)).toEqual(["Alpha Trail", "Zebra Trail"]);
  });

  it("deletes custom maps", () => {
    const map = createMapFromOptions({ title: "Temp", theme: "castle", layoutTemplate: "snake", boardLength: 12, id: "custom-del" });
    saveCustomMap({ id: map.id, title: map.title, map });
    deleteCustomMap(map.id);
    expect(readCustomMap(map.id)).toBeNull();
  });
});

describe("map mutations", () => {
  it("updates interior square type and effects", () => {
    let map = createMapFromOptions({
      title: "Test",
      theme: "classroom",
      layoutTemplate: "snake",
      boardLength: 10,
    });
    const spaceId = map.pathOrder[3]!;
    map = updateSpace(map, spaceId, { type: "bonus", label: "Star Bonus" });
    const updated = map.spaces.find((space) => space.id === spaceId);
    expect(updated?.type).toBe("bonus");
    expect(updated?.effects?.onLand).toBe("moveAhead3");
  });

  it("does not update start or finish spaces", () => {
    const map = createMapFromOptions({
      title: "Test",
      theme: "classroom",
      layoutTemplate: "snake",
      boardLength: 8,
    });
    const startId = map.pathOrder[0]!;
    const next = updateSpace(map, startId, { type: "bonus", label: "Nope" });
    expect(next.spaces.find((space) => space.id === startId)?.type).toBe("start");
  });

  it("adds forward shortcuts only", () => {
    let map = createMapFromOptions({
      title: "Test",
      theme: "ocean",
      layoutTemplate: "snake",
      boardLength: 12,
    });
    map = addConnectionByPathIndex(map, 4, 9, "bridge");
    expect(map.connections).toHaveLength(1);
    expect(() => addConnectionByPathIndex(map, 9, 4, "bridge")).toThrow();
  });

  it("clones built-in preset as custom map", () => {
    const source = getMapById("default-short");
    expect(source).not.toBeNull();
    const cloned = cloneMapAsCustom(source!, "My Short Copy", "custom-clone-1");
    expect(cloned.id).toBe("custom-clone-1");
    expect(cloned.pathOrder.length).toBe(source!.pathOrder.length);
  });
});
