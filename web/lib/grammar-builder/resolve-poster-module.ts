import "server-only";

import type { GrammarModulePersistedStatus } from "@/lib/data/grammar-modules";
import { getGrammarModuleRow, getPublishedGrammarModuleRow } from "@/lib/data/grammar-modules";
import type { GrammarCatalogEntry } from "./catalog-schema";
import { getGrammarCatalogEntry } from "./load-catalog";
import {
  loadPosterModuleForEditor,
  type PosterEditorLoadResult,
} from "./editor/load-poster-module-for-editor";
import { GrammarModuleLoadError } from "./load-poster-module-by-slug";
import type { PosterModuleView } from "./map-poster-module";
import { mapPosterModule } from "./map-poster-module";
import { getPosterJsonByFile } from "./poster-module-registry";
import { GrammarModuleParseError, parseGrammarModule } from "./validate-module";

export type PosterEditorLoadAsyncResult = PosterEditorLoadResult & {
  persistedStatus: GrammarModulePersistedStatus | null;
  source: "database" | "file";
};

function mapPosterViewFromRaw(slug: string, entry: GrammarCatalogEntry, raw: unknown): PosterModuleView {
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

function resolveFilePosterRaw(slug: string, entry: GrammarCatalogEntry): unknown {
  try {
    return getPosterJsonByFile(entry.file);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new GrammarModuleLoadError(slug, message);
  }
}

export async function loadPosterModuleForEditorAsync(slug: string): Promise<PosterEditorLoadAsyncResult> {
  const row = await getGrammarModuleRow(slug);
  if (row) {
    return {
      slug: row.slug,
      title: row.title,
      sourceFile: row.source_file,
      raw: row.module_json,
      persistedStatus: row.status,
      source: "database",
    };
  }

  const fileLoaded = loadPosterModuleForEditor(slug);
  return {
    ...fileLoaded,
    persistedStatus: null,
    source: "file",
  };
}

export async function loadPosterModuleBySlugAsync(slug: string): Promise<PosterModuleView> {
  const entry = getGrammarCatalogEntry(slug);
  if (!entry || entry.status !== "published") {
    throw new GrammarModuleLoadError(slug, `Grammar poster not found or not published: ${slug}`);
  }

  const row = await getPublishedGrammarModuleRow(slug);
  const raw =
    row ? row.module_json : resolveFilePosterRaw(slug, entry);

  return mapPosterViewFromRaw(slug, entry, raw);
}
