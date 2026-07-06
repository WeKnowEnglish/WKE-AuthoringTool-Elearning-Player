import affirmativeJson from "@/content/grammar/there-is-there-are-affirmative-a1.json";
import countableJson from "@/content/grammar/countable-nouns-a1.json";
import pluralPronunciationJson from "@/content/grammar/plural-pronunciation-a2.json";
import pluralSpellingJson from "@/content/grammar/plural-spelling-a2.json";
import questionsJson from "@/content/grammar/there-is-there-are-poster-a1.json";
import shortAnswersJson from "@/content/grammar/short-answers-there-is-a1.json";
import someAndAnyJson from "@/content/grammar/some-and-any-a2.json";
import uncountableJson from "@/content/grammar/uncountable-nouns-a1.json";

export const POSTER_JSON_BY_FILE: Record<string, unknown> = {
  "there-is-there-are-poster-a1.json": questionsJson,
  "there-is-there-are-affirmative-a1.json": affirmativeJson,
  "short-answers-there-is-a1.json": shortAnswersJson,
  "countable-nouns-a1.json": countableJson,
  "uncountable-nouns-a1.json": uncountableJson,
  "some-and-any-a2.json": someAndAnyJson,
  "plural-spelling-a2.json": pluralSpellingJson,
  "plural-pronunciation-a2.json": pluralPronunciationJson,
};

export function getPosterJsonByFile(file: string): unknown {
  const json = POSTER_JSON_BY_FILE[file];
  if (!json) {
    throw new Error(`Poster JSON file is not registered in poster-module-registry: ${file}`);
  }
  return json;
}

export function getRegisteredPosterModuleFiles(): string[] {
  return Object.keys(POSTER_JSON_BY_FILE);
}
