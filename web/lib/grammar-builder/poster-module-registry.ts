import affirmativeJson from "@/content/grammar/there-is-there-are-affirmative-a1.json";
import questionsJson from "@/content/grammar/there-is-there-are-poster-a1.json";

export const POSTER_JSON_BY_FILE: Record<string, unknown> = {
  "there-is-there-are-poster-a1.json": questionsJson,
  "there-is-there-are-affirmative-a1.json": affirmativeJson,
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
