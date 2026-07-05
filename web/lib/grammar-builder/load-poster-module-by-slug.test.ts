import { describe, expect, it } from "vitest";
import {
  AFFIRMATIVE_POSTER_SLUG,
  QUESTIONS_POSTER_SLUG,
} from "./catalog-schema";
import { getPublishedGrammarSlugs } from "./load-catalog";
import { GrammarModuleLoadError, loadPosterModuleBySlug } from "./load-poster-module-by-slug";

describe("loadPosterModuleBySlug", () => {
  it("loads the questions poster by slug", () => {
    const view = loadPosterModuleBySlug(QUESTIONS_POSTER_SLUG);

    expect(view.pageLayout).toBe("two-equal-then-full");
    expect(view.sections).toHaveLength(3);
    expect(view.hero.highlightA.text).toBe("THERE IS");
    expect(view.hero.suffix).toBe("QUESTIONS");
  });

  it("loads the affirmative poster by slug", () => {
    const view = loadPosterModuleBySlug(AFFIRMATIVE_POSTER_SLUG);

    expect(view.pageLayout).toBe("two-equal-then-full");
    expect(view.sections).toHaveLength(3);
    expect(view.hero.highlightA.text).toBe("THERE IS");
    expect(view.hero.suffix).toBe("AFFIRMATIVE");
    expect(view.sections[1]?.internalLayout).toBe("two_equal_narrow");
    expect(view.sections[2]?.rememberBanner?.body).toContain("There's");
  });

  it("throws for unknown slugs", () => {
    expect(() => loadPosterModuleBySlug("not-a-real-poster")).toThrow(GrammarModuleLoadError);
  });
});

describe("getPublishedGrammarSlugs", () => {
  it("includes both live A1 posters", () => {
    const slugs = getPublishedGrammarSlugs();

    expect(slugs).toContain(QUESTIONS_POSTER_SLUG);
    expect(slugs).toContain(AFFIRMATIVE_POSTER_SLUG);
  });
});

describe("loadPilotPosterModule", () => {
  it("delegates to the questions slug", async () => {
    const { loadPilotPosterModule } = await import("./load-poster-module");
    const view = loadPilotPosterModule();

    expect(view.hero.suffix).toBe("QUESTIONS");
  });
});
