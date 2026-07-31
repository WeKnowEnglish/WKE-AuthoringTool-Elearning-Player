import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  AFFIRMATIVE_POSTER_SLUG,
  QUESTIONS_POSTER_SLUG,
} from "./catalog-schema";
import { getPublishedGrammarSlugs } from "./load-catalog";
import { SHORT_ANSWERS_A1_FIXTURE_PATH } from "./fixture-path";
import { GrammarModuleLoadError, loadPosterModuleBySlug } from "./load-poster-module-by-slug";
import { parseGrammarModule } from "./validate-module";

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
    expect(view.sections[1]?.internalLayout).toBe("full_width");
    expect(view.sections[2]?.rememberBanner?.body).toContain("There's");
  });

  it("loads short-answers-there-is-a1", () => {
    const view = loadPosterModuleBySlug("short-answers-there-is-a1");

    expect(view.sections).toHaveLength(3);
    expect(view.sections[2]?.internalLayout).toBe("summary_grid");
  });

  it("loads countable-nouns-a1", () => {
    const view = loadPosterModuleBySlug("countable-nouns-a1");

    expect(view.sections).toHaveLength(3);
    expect(view.sections[1]?.internalLayout).toBe("four_card_grid");
  });

  it("loads uncountable-nouns-a1", () => {
    const view = loadPosterModuleBySlug("uncountable-nouns-a1");

    expect(view.sections[0]?.goodBadPair?.good.sentence).toContain("How much");
  });

  it("loads some-and-any-a2", () => {
    const view = loadPosterModuleBySlug("some-and-any-a2");

    expect(view.sections).toHaveLength(5);
    expect(view.pageLayout).toBe("two-by-two-then-full");
  });

  it("loads plural-spelling-a2", () => {
    const view = loadPosterModuleBySlug("plural-spelling-a2");

    expect(view.pageLayout).toBe("four-card-grid-then-split");
    expect(view.sections).toHaveLength(6);
  });

  it("loads plural-pronunciation-a2", () => {
    const view = loadPosterModuleBySlug("plural-pronunciation-a2");

    expect(view.pageLayout).toBe("two-equal");
    expect(view.sections).toHaveLength(3);
  });

  it("throws for unknown slugs", () => {
    expect(() => loadPosterModuleBySlug("not-a-real-poster")).toThrow(GrammarModuleLoadError);
  });

  it("parses short answers runtime JSON directly", () => {
    const raw = JSON.parse(readFileSync(SHORT_ANSWERS_A1_FIXTURE_PATH, "utf8"));
    const module = parseGrammarModule(raw);

    expect(module.displayMode).toBe("poster");
    expect(module.cards).toHaveLength(3);
  });
});

describe("getPublishedGrammarSlugs", () => {
  it("includes live posters", () => {
    const slugs = getPublishedGrammarSlugs();

    expect(slugs).toContain(QUESTIONS_POSTER_SLUG);
    expect(slugs).toContain(AFFIRMATIVE_POSTER_SLUG);
    expect(slugs).toContain("short-answers-there-is-a1");
    expect(slugs).toContain("some-and-any-a2");
    expect(slugs.length).toBeGreaterThanOrEqual(8);
  });
});

describe("loadPilotPosterModule", () => {
  it("delegates to the questions slug", async () => {
    const { loadPilotPosterModule } = await import("./load-poster-module");
    const view = loadPilotPosterModule();

    expect(view.hero.suffix).toBe("QUESTIONS");
  });
});
