import { loadPosterModuleBySlug } from "./load-poster-module-by-slug";
import { QUESTIONS_POSTER_SLUG } from "./catalog-schema";

export { QUESTIONS_POSTER_SLUG, AFFIRMATIVE_POSTER_SLUG, PILOT_POSTER_SLUG } from "./catalog-schema";

/** @deprecated Use loadPosterModuleBySlug(QUESTIONS_POSTER_SLUG) */
export function loadPilotPosterModule() {
  return loadPosterModuleBySlug(QUESTIONS_POSTER_SLUG);
}
