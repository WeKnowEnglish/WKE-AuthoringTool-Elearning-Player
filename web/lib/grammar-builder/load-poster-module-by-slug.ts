import { getGrammarCatalogEntry } from "./load-catalog";
import { mapPosterModule, type PosterModuleView } from "./map-poster-module";
import { getPosterJsonByFile } from "./poster-module-registry";
import { GrammarModuleParseError, parseGrammarModule } from "./validate-module";

export class GrammarModuleLoadError extends Error {
  readonly slug: string;

  constructor(slug: string, message: string) {
    super(message);
    this.name = "GrammarModuleLoadError";
    this.slug = slug;
  }
}

export function loadPosterModuleBySlug(slug: string): PosterModuleView {
  const entry = getGrammarCatalogEntry(slug);
  if (!entry || entry.status !== "published") {
    throw new GrammarModuleLoadError(slug, `Grammar poster not found or not published: ${slug}`);
  }

  let raw: unknown;
  try {
    raw = getPosterJsonByFile(entry.file);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new GrammarModuleLoadError(slug, message);
  }

  const module = parseGrammarModule(raw);

  if (module.displayMode !== "poster") {
    throw new GrammarModuleParseError(`Grammar poster requires displayMode: poster (${slug})`, [
      {
        path: "displayMode",
        message: `Expected poster, received ${module.displayMode}`,
      },
    ]);
  }

  if (entry.difficulty && module.difficulty && entry.difficulty !== module.difficulty) {
    throw new GrammarModuleLoadError(
      slug,
      `Catalog difficulty ${entry.difficulty} does not match module difficulty ${module.difficulty}`,
    );
  }

  return mapPosterModule(module);
}
