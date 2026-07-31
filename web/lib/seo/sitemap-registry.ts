import type { MetadataRoute } from "next";
import { getPublishedGrammarSlugs } from "@/lib/grammar-builder/load-catalog";
import { getResourceSitemapSources } from "@/lib/resources/load-articles";
import { canonicalUrl } from "@/lib/seo/canonical";

export type SitemapEntrySource = {
  /** Pathname without origin (`/` or `/grammar/...`). */
  path: string;
  /** Honest content date; omit when unknown. Never use `new Date()` at request time. */
  lastModified?: string;
  /** Must be true to appear in the sitemap. */
  published: boolean;
  /** Indexable public HTML only. */
  indexable: boolean;
  /** Reject parameterized or preview URLs. */
  parameterized?: boolean;
  preview?: boolean;
  embed?: boolean;
  authenticatedOnly?: boolean;
};

function isEligible(entry: SitemapEntrySource): boolean {
  if (!entry.published) return false;
  if (!entry.indexable) return false;
  if (entry.parameterized) return false;
  if (entry.preview) return false;
  if (entry.embed) return false;
  if (entry.authenticatedOnly) return false;
  if (!entry.path.startsWith("/")) return false;
  if (entry.path.includes("?")) return false;
  return true;
}

/**
 * Static marketing routes that currently exist and are intentionally indexable.
 * Pillars / about / hubs are added only when those pages ship.
 */
export function getStaticPublicSitemapSources(): SitemapEntrySource[] {
  return [
    { path: "/", published: true, indexable: true },
    { path: "/about", published: true, indexable: true },
    { path: "/contact", published: true, indexable: true },
    { path: "/privacy", published: true, indexable: true },
    { path: "/terms", published: true, indexable: true },
    { path: "/child-safety", published: true, indexable: true },
    { path: "/esl-activities-for-kids", published: true, indexable: true },
    { path: "/teach-english-online", published: true, indexable: true },
    { path: "/english-learning-for-kids-at-home", published: true, indexable: true },
    { path: "/grammar", published: true, indexable: true },
  ];
}

export function getGrammarSitemapSources(): SitemapEntrySource[] {
  return getPublishedGrammarSlugs().map((slug) => ({
    path: `/grammar/${slug}`,
    published: true,
    indexable: true,
  }));
}

export function collectSitemapSources(
  extras: SitemapEntrySource[] = [],
): SitemapEntrySource[] {
  return [
    ...getStaticPublicSitemapSources(),
    ...getGrammarSitemapSources(),
    ...getResourceSitemapSources(),
    ...extras,
  ];
}

export function filterSitemapSources(
  sources: SitemapEntrySource[],
): SitemapEntrySource[] {
  return sources.filter(isEligible);
}

export function toSitemapEntries(
  sources: SitemapEntrySource[],
): MetadataRoute.Sitemap {
  return filterSitemapSources(sources).map((entry) => {
    const item: MetadataRoute.Sitemap[number] = {
      url: canonicalUrl(entry.path),
    };
    if (entry.lastModified) {
      item.lastModified = entry.lastModified;
    }
    return item;
  });
}
