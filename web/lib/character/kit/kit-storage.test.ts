import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CHARACTER_KIT } from "./kit-defaults";
import {
  CHARACTER_KIT_STORAGE_KEY,
  kitFromJson,
  kitToPrettyJson,
  loadCharacterKit,
  saveCharacterKit,
} from "./kit-storage";

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

describe("character kit storage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("saves and reloads a kit document", () => {
    const localStorage = createMemoryStorage();
    vi.stubGlobal("localStorage", localStorage);
    vi.stubGlobal("window", Object.assign(globalThis, { localStorage }));

    saveCharacterKit({ ...DEFAULT_CHARACTER_KIT, name: "Side part" }, "student-1");
    expect(loadCharacterKit("student-1")?.name).toBe("Side part");
    expect(localStorage.getItem(`${CHARACTER_KIT_STORAGE_KEY}:student-1`)).toContain("Side part");
  });

  it("round-trips pretty JSON that Cursor can edit", () => {
    const next = kitFromJson(kitToPrettyJson({ ...DEFAULT_CHARACTER_KIT, id: "kit_cursor" }));
    expect(next.id).toBe("kit_cursor");
    expect(next.hero).toBe("toy_head_v1");
  });
});
