import { QUESTIONS_POSTER_SLUG, type GrammarCatalogEntry } from "../catalog-schema";
import {
  getPublishedGrammarModules,
  groupPublishedGrammarModulesByTopic,
  GRAMMAR_TOPIC_GROUP_LABELS,
} from "../load-catalog";
import { getPosterJsonByFile } from "../poster-module-registry";
import type { GrammarLayoutType, GrammarPageLayout } from "../schema";

export type GrammarPosterVariation = {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty?: GrammarCatalogEntry["difficulty"];
  thumbnailEmoji?: string;
  topicGroup: string;
  topicLabel: string;
  sourceFile: string;
  pageLayout: GrammarPageLayout | null;
  layoutTypes: GrammarLayoutType[];
  /** Canonical Grammar Poster shell until further development. */
  canonical: boolean;
};

type Fingerprint = {
  pageLayout: GrammarPageLayout | null;
  layoutTypes: GrammarLayoutType[];
};

function readFingerprint(file: string): Fingerprint {
  try {
    const raw = getPosterJsonByFile(file) as {
      pageLayout?: GrammarPageLayout;
      cards?: Array<{ layoutType?: GrammarLayoutType }>;
    };
    return {
      pageLayout: raw.pageLayout ?? null,
      layoutTypes: (raw.cards ?? [])
        .map((card) => card.layoutType)
        .filter((value): value is GrammarLayoutType => Boolean(value)),
    };
  } catch {
    return { pageLayout: null, layoutTypes: [] };
  }
}

function toVariation(entry: GrammarCatalogEntry): GrammarPosterVariation {
  const topicGroup = entry.topicGroup ?? "general";
  const fingerprint = readFingerprint(entry.file);

  return {
    id: entry.slug,
    slug: entry.slug,
    title: entry.title,
    description: entry.description ?? "",
    difficulty: entry.difficulty,
    thumbnailEmoji: entry.thumbnailEmoji,
    topicGroup,
    topicLabel: GRAMMAR_TOPIC_GROUP_LABELS[topicGroup] ?? formatTopicGroupLabel(topicGroup),
    sourceFile: entry.file,
    pageLayout: fingerprint.pageLayout,
    layoutTypes: fingerprint.layoutTypes,
    canonical: entry.slug === QUESTIONS_POSTER_SLUG,
  };
}

function formatTopicGroupLabel(groupId: string): string {
  return groupId
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function getGrammarPosterVariations(): GrammarPosterVariation[] {
  return getPublishedGrammarModules().map(toVariation);
}

export function getCanonicalGrammarPosterVariation(): GrammarPosterVariation {
  const variations = getGrammarPosterVariations();
  const canonical = variations.find((entry) => entry.canonical);
  if (!canonical) {
    throw new Error(`Canonical grammar poster variation missing: ${QUESTIONS_POSTER_SLUG}`);
  }
  return canonical;
}

export function getGrammarPosterVariationBySlug(
  slug: string,
): GrammarPosterVariation | undefined {
  return getGrammarPosterVariations().find((entry) => entry.slug === slug);
}

export function groupGrammarPosterVariationsByTopic(): {
  groupId: string;
  label: string;
  variations: GrammarPosterVariation[];
}[] {
  const bySlug = new Map(getGrammarPosterVariations().map((entry) => [entry.slug, entry]));

  return groupPublishedGrammarModulesByTopic().map((group) => ({
    groupId: group.groupId,
    label: group.label,
    variations: group.modules
      .map((entry) => bySlug.get(entry.slug))
      .filter((entry): entry is GrammarPosterVariation => Boolean(entry)),
  }));
}
