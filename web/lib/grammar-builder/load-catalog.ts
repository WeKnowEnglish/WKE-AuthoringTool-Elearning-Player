import catalogJson from "@/content/grammar/catalog.json";
import { grammarCatalogSchema, type GrammarCatalog, type GrammarCatalogEntry } from "./catalog-schema";

let cachedCatalog: GrammarCatalog | undefined;

export function loadGrammarCatalog(): GrammarCatalog {
  if (!cachedCatalog) {
    cachedCatalog = grammarCatalogSchema.parse(catalogJson);
  }
  return cachedCatalog;
}

export function getGrammarCatalogEntry(slug: string): GrammarCatalogEntry | undefined {
  return loadGrammarCatalog().modules.find((entry) => entry.slug === slug);
}

export function getPublishedGrammarSlugs(): string[] {
  return loadGrammarCatalog()
    .modules.filter((entry) => entry.status === "published")
    .map((entry) => entry.slug);
}

export function getRegisteredGrammarModuleFiles(): string[] {
  return loadGrammarCatalog().modules.map((entry) => entry.file);
}
