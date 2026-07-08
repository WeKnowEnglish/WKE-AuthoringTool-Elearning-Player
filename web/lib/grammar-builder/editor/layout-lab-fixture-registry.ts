import affirmativeJson from "@/docs/grammar-module/examples/there-is-there-are-affirmative-a1.json";
import countableExcerptJson from "@/docs/grammar-module/examples/countable-nouns-author-excerpt.json";
import pluralComparisonJson from "@/docs/grammar-module/examples/plural-spelling-comparison.json";
import pluralPageShellJson from "@/docs/grammar-module/examples/plural-spelling-page-shell.json";
import pluralPronunciationJson from "@/docs/grammar-module/examples/plural-pronunciation-author.json";
import shortAnswersJson from "@/docs/grammar-module/examples/short-answers-there-is-author.json";
import someAndAnyJson from "@/docs/grammar-module/examples/some-and-any-author.json";
import thereIsThereAreJson from "@/docs/grammar-module/examples/there-is-there-are.json";

export const LAYOUT_LAB_FIXTURE_JSON: Record<string, unknown> = {
  "there-is-there-are-affirmative-a1.json": affirmativeJson,
  "countable-nouns-author-excerpt.json": countableExcerptJson,
  "plural-spelling-comparison.json": pluralComparisonJson,
  "plural-spelling-page-shell.json": pluralPageShellJson,
  "plural-pronunciation-author.json": pluralPronunciationJson,
  "short-answers-there-is-author.json": shortAnswersJson,
  "some-and-any-author.json": someAndAnyJson,
  "there-is-there-are.json": thereIsThereAreJson,
};

export function getLayoutLabFixtureJson(fileName: string): unknown {
  const json = LAYOUT_LAB_FIXTURE_JSON[fileName];
  if (!json) {
    throw new Error(`Layout lab fixture is not registered: ${fileName}`);
  }
  return json;
}
