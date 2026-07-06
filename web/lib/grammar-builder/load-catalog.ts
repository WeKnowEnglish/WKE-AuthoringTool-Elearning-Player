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
  return getPublishedGrammarModules().map((entry) => entry.slug);
}

function catalogEntrySortKey(entry: GrammarCatalogEntry, index: number): number {
  return entry.sortOrder ?? index + 1;
}

export function getPublishedGrammarModules(): GrammarCatalogEntry[] {
  const published = loadGrammarCatalog().modules.filter((entry) => entry.status === "published");
  return published
    .map((entry, index) => ({ entry, index }))
    .sort(
      (a, b) =>
        catalogEntrySortKey(a.entry, a.index) - catalogEntrySortKey(b.entry, b.index) ||
        a.entry.title.localeCompare(b.entry.title),
    )
    .map(({ entry }) => entry);
}

export function groupPublishedGrammarModulesByTopic(): {
  groupId: string;
  label: string;
  modules: GrammarCatalogEntry[];
}[] {
  const modules = getPublishedGrammarModules();
  const groupOrder: string[] = [];
  const grouped = new Map<string, GrammarCatalogEntry[]>();

  for (const entry of modules) {
    const groupId = entry.topicGroup ?? "general";
    if (!grouped.has(groupId)) {
      grouped.set(groupId, []);
      groupOrder.push(groupId);
    }
    grouped.get(groupId)!.push(entry);
  }

  return groupOrder.map((groupId) => ({
    groupId,
    label: GRAMMAR_TOPIC_GROUP_LABELS[groupId] ?? formatTopicGroupLabel(groupId),
    modules: grouped.get(groupId)!,
  }));
}

const GRAMMAR_TOPIC_GROUP_LABELS: Record<string, string> = {
  "there-is-there-are": "There is / There are",
  nouns: "Nouns",
  quantifiers: "Some and Any",
  general: "Grammar",
};

function formatTopicGroupLabel(groupId: string): string {
  return groupId
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function getRegisteredGrammarModuleFiles(): string[] {
  return loadGrammarCatalog().modules.map((entry) => entry.file);
}
