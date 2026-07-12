import { describe, expect, it, vi } from "vitest";
import { GrammarModuleLoadError } from "./load-poster-module-by-slug";
import { loadPosterModuleBySlugAsync } from "./resolve-poster-module";

vi.mock("@/lib/data/grammar-modules", () => ({
  getGrammarModuleRow: vi.fn(async () => null),
  getPublishedGrammarModuleRow: vi.fn(async () => null),
}));

describe("loadPosterModuleBySlugAsync", () => {
  it("falls back to bundled JSON when no database row exists", async () => {
    const view = await loadPosterModuleBySlugAsync("countable-nouns-a1");
    expect(view.sections).toHaveLength(3);
  });

  it("throws for unknown slugs", async () => {
    await expect(loadPosterModuleBySlugAsync("not-a-real-poster")).rejects.toThrow(
      GrammarModuleLoadError,
    );
  });
});
