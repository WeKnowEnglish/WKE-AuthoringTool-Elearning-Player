import { join } from "node:path";

/** Runtime JSON filename for the questions A1 poster (slug differs via catalog). */
export const QUESTIONS_POSTER_FILENAME = "there-is-there-are-poster-a1.json";
export const AFFIRMATIVE_POSTER_FILENAME = "there-is-there-are-affirmative-a1.json";
export const SHORT_ANSWERS_A1_FILENAME = "short-answers-there-is-a1.json";
export const COUNTABLE_NOUNS_A1_FILENAME = "countable-nouns-a1.json";
export const UNCOUNTABLE_NOUNS_A1_FILENAME = "uncountable-nouns-a1.json";
export const SOME_AND_ANY_A2_FILENAME = "some-and-any-a2.json";
export const PLURAL_SPELLING_A2_FILENAME = "plural-spelling-a2.json";
export const PLURAL_PRONUNCIATION_A2_FILENAME = "plural-pronunciation-a2.json";

const CONTENT_DIR = join(process.cwd(), "content/grammar");
const AUTHOR_DIR = join(process.cwd(), "docs/grammar-module/examples");

function contentPath(filename: string) {
  return join(CONTENT_DIR, filename);
}

function authorPath(filename: string) {
  return join(AUTHOR_DIR, filename);
}

/** Runtime content loaded by `/grammar/[slug]`. Author copy: docs/grammar-module/examples/. */
export const QUESTIONS_POSTER_FIXTURE_PATH = contentPath(QUESTIONS_POSTER_FILENAME);
export const AFFIRMATIVE_POSTER_FIXTURE_PATH = contentPath(AFFIRMATIVE_POSTER_FILENAME);
export const SHORT_ANSWERS_A1_FIXTURE_PATH = contentPath(SHORT_ANSWERS_A1_FILENAME);
export const COUNTABLE_NOUNS_A1_FIXTURE_PATH = contentPath(COUNTABLE_NOUNS_A1_FILENAME);
export const UNCOUNTABLE_NOUNS_A1_FIXTURE_PATH = contentPath(UNCOUNTABLE_NOUNS_A1_FILENAME);
export const SOME_AND_ANY_A2_FIXTURE_PATH = contentPath(SOME_AND_ANY_A2_FILENAME);
export const PLURAL_SPELLING_A2_FIXTURE_PATH = contentPath(PLURAL_SPELLING_A2_FILENAME);
export const PLURAL_PRONUNCIATION_A2_FIXTURE_PATH = contentPath(PLURAL_PRONUNCIATION_A2_FILENAME);

/** @deprecated Use QUESTIONS_POSTER_FIXTURE_PATH */
export const PILOT_POSTER_FIXTURE_PATH = QUESTIONS_POSTER_FIXTURE_PATH;

export const QUESTIONS_POSTER_AUTHOR_FIXTURE_PATH = authorPath(QUESTIONS_POSTER_FILENAME);
export const AFFIRMATIVE_POSTER_AUTHOR_FIXTURE_PATH = authorPath(AFFIRMATIVE_POSTER_FILENAME);
export const SHORT_ANSWERS_A1_AUTHOR_FIXTURE_PATH = authorPath(SHORT_ANSWERS_A1_FILENAME);
export const COUNTABLE_NOUNS_A1_AUTHOR_FIXTURE_PATH = authorPath(COUNTABLE_NOUNS_A1_FILENAME);
export const UNCOUNTABLE_NOUNS_A1_AUTHOR_FIXTURE_PATH = authorPath(UNCOUNTABLE_NOUNS_A1_FILENAME);
export const SOME_AND_ANY_A2_AUTHOR_FIXTURE_PATH = authorPath(SOME_AND_ANY_A2_FILENAME);
export const PLURAL_SPELLING_A2_AUTHOR_FIXTURE_PATH = authorPath(PLURAL_SPELLING_A2_FILENAME);
export const PLURAL_PRONUNCIATION_A2_AUTHOR_FIXTURE_PATH = authorPath(PLURAL_PRONUNCIATION_A2_FILENAME);

/** @deprecated Use QUESTIONS_POSTER_AUTHOR_FIXTURE_PATH */
export const PILOT_POSTER_AUTHOR_FIXTURE_PATH = QUESTIONS_POSTER_AUTHOR_FIXTURE_PATH;
