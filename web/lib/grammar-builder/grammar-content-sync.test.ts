import { readFileSync } from "node:fs";
import { join } from "node:path";
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
  COUNTABLE_NOUNS_A1_AUTHOR_FIXTURE_PATH,
  COUNTABLE_NOUNS_A1_FIXTURE_PATH,
  PLURAL_PRONUNCIATION_A2_AUTHOR_FIXTURE_PATH,
  PLURAL_PRONUNCIATION_A2_FIXTURE_PATH,
  PLURAL_SPELLING_A2_AUTHOR_FIXTURE_PATH,
  PLURAL_SPELLING_A2_FIXTURE_PATH,
  QUESTIONS_POSTER_AUTHOR_FIXTURE_PATH,
  QUESTIONS_POSTER_FIXTURE_PATH,
  SHORT_ANSWERS_A1_AUTHOR_FIXTURE_PATH,
  SHORT_ANSWERS_A1_FIXTURE_PATH,
  SOME_AND_ANY_A2_AUTHOR_FIXTURE_PATH,
  SOME_AND_ANY_A2_FIXTURE_PATH,
  UNCOUNTABLE_NOUNS_A1_AUTHOR_FIXTURE_PATH,
  UNCOUNTABLE_NOUNS_A1_FIXTURE_PATH,
} from "./fixture-path";

function expectRuntimeMatchesAuthor(runtimePath: string, authorPath: string) {
  const runtime = readFileSync(runtimePath, "utf8");
  const author = readFileSync(authorPath, "utf8");
  expect(runtime).toBe(author);
}

describe("grammar content sync", () => {
  it("keeps questions runtime JSON in sync with the author example", () => {
    expectRuntimeMatchesAuthor(QUESTIONS_POSTER_FIXTURE_PATH, QUESTIONS_POSTER_AUTHOR_FIXTURE_PATH);
  });

  it("keeps affirmative runtime JSON in sync with the author example", () => {
    expectRuntimeMatchesAuthor(
      AFFIRMATIVE_POSTER_FIXTURE_PATH,
      AFFIRMATIVE_POSTER_AUTHOR_FIXTURE_PATH,
    );
  });

  it("keeps short answers runtime JSON in sync with the author example", () => {
    expectRuntimeMatchesAuthor(SHORT_ANSWERS_A1_FIXTURE_PATH, SHORT_ANSWERS_A1_AUTHOR_FIXTURE_PATH);
  });

  it("keeps countable nouns runtime JSON in sync with the author example", () => {
    expectRuntimeMatchesAuthor(
      COUNTABLE_NOUNS_A1_FIXTURE_PATH,
      COUNTABLE_NOUNS_A1_AUTHOR_FIXTURE_PATH,
    );
  });

  it("keeps uncountable nouns runtime JSON in sync with the author example", () => {
    expectRuntimeMatchesAuthor(
      UNCOUNTABLE_NOUNS_A1_FIXTURE_PATH,
      UNCOUNTABLE_NOUNS_A1_AUTHOR_FIXTURE_PATH,
    );
  });

  it("keeps some and any runtime JSON in sync with the author example", () => {
    expectRuntimeMatchesAuthor(SOME_AND_ANY_A2_FIXTURE_PATH, SOME_AND_ANY_A2_AUTHOR_FIXTURE_PATH);
  });

  it("keeps plural spelling draft runtime JSON in sync with the author example", () => {
    expectRuntimeMatchesAuthor(
      PLURAL_SPELLING_A2_FIXTURE_PATH,
      PLURAL_SPELLING_A2_AUTHOR_FIXTURE_PATH,
    );
  });

  it("keeps plural pronunciation draft runtime JSON in sync with the author example", () => {
    expectRuntimeMatchesAuthor(
      PLURAL_PRONUNCIATION_A2_FIXTURE_PATH,
      PLURAL_PRONUNCIATION_A2_AUTHOR_FIXTURE_PATH,
    );
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
    expect(slugs.length).toBeGreaterThanOrEqual(6);
  });
});
