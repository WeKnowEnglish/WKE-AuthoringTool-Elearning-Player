import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CHARACTER_CONFIG } from "./character-defaults";
import {
  CHARACTER_STORAGE_KEY,
  clearCharacterConfig,
  loadCharacterConfig,
  saveCharacterConfig,
} from "./character-storage";

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
}

describe("character-storage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("saves and reloads a normalized config", () => {
    const localStorage = createMemoryStorage();
    vi.stubGlobal("localStorage", localStorage);
    vi.stubGlobal("window", Object.assign(globalThis, { localStorage }));

    saveCharacterConfig({ ...DEFAULT_CHARACTER_CONFIG, hair: "hair_04" }, "student-1");
    expect(loadCharacterConfig("student-1")?.hair).toBe("hair_04");
    expect(localStorage.getItem(`${CHARACTER_STORAGE_KEY}:student-1`)).toContain("hair_04");
  });

  it("returns null for missing or invalid JSON", () => {
    const localStorage = createMemoryStorage();
    vi.stubGlobal("localStorage", localStorage);
    vi.stubGlobal("window", Object.assign(globalThis, { localStorage }));

    expect(loadCharacterConfig("student-1")).toBeNull();
    localStorage.setItem(`${CHARACTER_STORAGE_KEY}:student-1`, "{not-json");
    expect(loadCharacterConfig("student-1")).toBeNull();
  });

  it("clears a saved config", () => {
    const localStorage = createMemoryStorage();
    vi.stubGlobal("localStorage", localStorage);
    vi.stubGlobal("window", Object.assign(globalThis, { localStorage }));

    saveCharacterConfig(DEFAULT_CHARACTER_CONFIG, "student-1");
    clearCharacterConfig("student-1");
    expect(loadCharacterConfig("student-1")).toBeNull();
  });
});
