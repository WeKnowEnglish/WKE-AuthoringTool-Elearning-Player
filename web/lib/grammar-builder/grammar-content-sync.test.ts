import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getPublishedGrammarSlugs } from "./load-catalog";
import {
  getRegisteredPosterModuleFiles,
  POSTER_JSON_BY_FILE,
} from "./poster-module-registry";
import { getRegisteredGrammarModuleFiles } from "./load-catalog";
import {
  AFFIRMATIVE_POSTER_AUTHOR_FIXTURE_PATH,
  AFFIRMATIVE_POSTER_FIXTURE_PATH,
  QUESTIONS_POSTER_AUTHOR_FIXTURE_PATH,
  QUESTIONS_POSTER_FIXTURE_PATH,
} from "./fixture-path";

describe("grammar content sync", () => {
  it("keeps questions runtime JSON in sync with the author example", () => {
    const runtime = readFileSync(QUESTIONS_POSTER_FIXTURE_PATH, "utf8");
    const author = readFileSync(QUESTIONS_POSTER_AUTHOR_FIXTURE_PATH, "utf8");

    expect(runtime).toBe(author);
  });

  it("keeps affirmative runtime JSON in sync with the author example", () => {
    const runtime = readFileSync(AFFIRMATIVE_POSTER_FIXTURE_PATH, "utf8");
    const author = readFileSync(AFFIRMATIVE_POSTER_AUTHOR_FIXTURE_PATH, "utf8");

    expect(runtime).toBe(author);
  });
});

describe("grammar catalog registry sync", () => {
  it("registers every catalog module file", () => {
    const catalogFiles = getRegisteredGrammarModuleFiles();
    const registryFiles = getRegisteredPosterModuleFiles();

    for (const file of catalogFiles) {
      expect(registryFiles).toContain(file);
      expect(POSTER_JSON_BY_FILE[file]).toBeDefined();
    }
  });

  it("matches published slugs to registry files", () => {
    const slugs = getPublishedGrammarSlugs();
    expect(slugs.length).toBeGreaterThanOrEqual(2);
  });
});
