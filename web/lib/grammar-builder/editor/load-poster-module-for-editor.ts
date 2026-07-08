import { getGrammarCatalogEntry } from "../load-catalog";
import { getPosterJsonByFile } from "../poster-module-registry";

export type PosterEditorLoadResult = {
  slug: string;
  title: string;
  sourceFile: string;
  raw: unknown;
};

export class PosterEditorLoadError extends Error {
  readonly slug: string;

  constructor(slug: string, message: string) {
    super(message);
    this.name = "PosterEditorLoadError";
    this.slug = slug;
  }
}

export function loadPosterModuleForEditor(slug: string): PosterEditorLoadResult {
  const entry = getGrammarCatalogEntry(slug);
  if (!entry) {
    throw new PosterEditorLoadError(slug, `Grammar poster not found in catalog: ${slug}`);
  }

  let raw: unknown;
  try {
    raw = getPosterJsonByFile(entry.file);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new PosterEditorLoadError(slug, message);
  }

  return {
    slug,
    title: entry.title,
    sourceFile: entry.file,
    raw,
  };
}
