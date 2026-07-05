import { join } from "node:path";

/** Runtime JSON filename for the questions A1 poster (slug differs via catalog). */
export const QUESTIONS_POSTER_FILENAME = "there-is-there-are-poster-a1.json";
export const AFFIRMATIVE_POSTER_FILENAME = "there-is-there-are-affirmative-a1.json";

/** Runtime content loaded by `/grammar/[slug]`. Author copy: docs/grammar-module/examples/. */
export const QUESTIONS_POSTER_FIXTURE_PATH = join(
  process.cwd(),
  "content/grammar",
  QUESTIONS_POSTER_FILENAME,
);

export const AFFIRMATIVE_POSTER_FIXTURE_PATH = join(
  process.cwd(),
  "content/grammar",
  AFFIRMATIVE_POSTER_FILENAME,
);

/** @deprecated Use QUESTIONS_POSTER_FIXTURE_PATH */
export const PILOT_POSTER_FIXTURE_PATH = QUESTIONS_POSTER_FIXTURE_PATH;

export const QUESTIONS_POSTER_AUTHOR_FIXTURE_PATH = join(
  process.cwd(),
  "docs/grammar-module/examples",
  QUESTIONS_POSTER_FILENAME,
);

export const AFFIRMATIVE_POSTER_AUTHOR_FIXTURE_PATH = join(
  process.cwd(),
  "docs/grammar-module/examples",
  AFFIRMATIVE_POSTER_FILENAME,
);

/** @deprecated Use QUESTIONS_POSTER_AUTHOR_FIXTURE_PATH */
export const PILOT_POSTER_AUTHOR_FIXTURE_PATH = QUESTIONS_POSTER_AUTHOR_FIXTURE_PATH;
