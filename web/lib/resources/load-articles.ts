import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { ContentReviewStatus } from "@/lib/seo/content-review";
import type { SitemapEntrySource } from "@/lib/seo/sitemap-registry";

const ARTICLES_DIR = path.join(process.cwd(), "content/resources/articles");

export type ResourceArticleMeta = {
  slug: string;
  title: string;
  description: string;
  pathname: string;
  published: boolean;
  reviewStatus: ContentReviewStatus;
  author: string;
  authorCredentials?: string;
  dateDrafted?: string;
  datePublished: string | null;
  dateModified: string;
  primaryIntent?: string;
  relatedInternal: string[];
};

export type ResourceArticle = ResourceArticleMeta & {
  body: string;
};

function isContentReviewStatus(value: unknown): value is ContentReviewStatus {
  return (
    value === "prototype" ||
    value === "editor-reviewed" ||
    value === "teacher-tested" ||
    value === "classroom-tested"
  );
}

/** gray-matter may coerce YAML dates into Date objects. */
function toIsoDate(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.slice(0, 10);
    }
    return trimmed;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return null;
}

function parseArticleFile(filePath: string): ResourceArticle {
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  const slugFromFile = path.basename(filePath, ".md");
  const slug = typeof data.slug === "string" ? data.slug : slugFromFile;
  const relatedInternal = Array.isArray(data.relatedInternal)
    ? data.relatedInternal.filter((item): item is string => typeof item === "string")
    : [];
  const datePublished = toIsoDate(data.datePublished);
  const dateModified =
    toIsoDate(data.dateModified) ??
    datePublished ??
    new Date().toISOString().slice(0, 10);

  return {
    slug,
    title: typeof data.title === "string" ? data.title : slug,
    description: typeof data.description === "string" ? data.description : "",
    pathname:
      typeof data.pathname === "string" ? data.pathname : `/resources/${slug}`,
    published: data.published === true,
    reviewStatus: isContentReviewStatus(data.reviewStatus)
      ? data.reviewStatus
      : "prototype",
    author: typeof data.author === "string" ? data.author : "Brady Myers",
    authorCredentials:
      typeof data.authorCredentials === "string" ? data.authorCredentials : undefined,
    dateDrafted: toIsoDate(data.dateDrafted) ?? undefined,
    datePublished,
    dateModified,
    primaryIntent:
      typeof data.primaryIntent === "string" ? data.primaryIntent : undefined,
    relatedInternal,
    body: content.replace(/<!--[\s\S]*?-->/g, "").trim(),
  };
}

function listArticleFiles(): string[] {
  if (!fs.existsSync(ARTICLES_DIR)) return [];
  return fs
    .readdirSync(ARTICLES_DIR)
    .filter((name) => name.endsWith(".md"))
    .map((name) => path.join(ARTICLES_DIR, name));
}

export function listResourceArticles(options?: {
  publishedOnly?: boolean;
}): ResourceArticleMeta[] {
  const publishedOnly = options?.publishedOnly ?? true;
  return listArticleFiles()
    .map((filePath) => {
      const article = parseArticleFile(filePath);
      const { body: _body, ...meta } = article;
      return meta;
    })
    .filter((article) => (publishedOnly ? article.published : true))
    .sort((a, b) => {
      const aDate = a.datePublished ?? a.dateModified;
      const bDate = b.datePublished ?? b.dateModified;
      return bDate.localeCompare(aDate);
    });
}

export function getResourceArticle(slug: string): ResourceArticle | null {
  const filePath = path.join(ARTICLES_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  const article = parseArticleFile(filePath);
  if (!article.published) return null;
  return article;
}

export function getPublishedResourceSlugs(): string[] {
  return listResourceArticles({ publishedOnly: true }).map((article) => article.slug);
}

/** Display dates like "28 July 2026" for bylines. */
export function formatResourceDisplayDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) return isoDate;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function getResourceSitemapSources(): SitemapEntrySource[] {
  const hub: SitemapEntrySource = {
    path: "/resources",
    published: true,
    indexable: true,
    lastModified: "2026-07-28",
  };
  const articles = listResourceArticles({ publishedOnly: true }).map((article) => ({
    path: article.pathname,
    published: article.published,
    indexable: true,
    lastModified: article.dateModified,
  }));
  return [hub, ...articles];
}
