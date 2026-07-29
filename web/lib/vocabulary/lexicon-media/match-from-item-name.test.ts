import { describe, expect, it } from "vitest";
import {
  itemNameFromFilename,
  matchMediaSurfaceToLexicon,
  simpleSingular,
} from "./match-from-item-name";

describe("matchMediaSurfaceToLexicon", () => {
  it("auto-links unambiguous single-word nouns", () => {
    const m = matchMediaSurfaceToLexicon("Apple");
    expect(m.autoLink).toBe(true);
    expect(m.chosen?.id).toBe("pv_apple_noun");
    expect(m.matchKind).toBe("exact");
  });

  it("singularizes plurals for high-confidence link", () => {
    const m = matchMediaSurfaceToLexicon("grapes");
    expect(m.autoLink).toBe(true);
    expect(m.chosen?.normalizedLemma).toBe("grape");
    expect(m.matchKind).toBe("singular");
  });

  it("queues multi-word with no phrase lemma", () => {
    const m = matchMediaSurfaceToLexicon("Komodo Dragon");
    expect(m.autoLink).toBe(false);
    expect(m.matchKind).toBe("none");
  });

  it("derives item name from filename", () => {
    expect(itemNameFromFilename("banana.png")).toBe("Banana");
    expect(itemNameFromFilename("ice_cream.jpg")).toBe("Ice Cream");
  });

  it("simpleSingular handles cookies", () => {
    expect(simpleSingular("cookies")).toBe("cookie");
  });
});
