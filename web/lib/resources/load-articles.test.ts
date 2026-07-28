import { describe, expect, it } from "vitest";
import {
  formatResourceDisplayDate,
  getPublishedResourceSlugs,
  getResourceArticle,
  getResourceSitemapSources,
  listResourceArticles,
} from "@/lib/resources/load-articles";

describe("resource articles", () => {
  it("lists published articles with expected slugs", () => {
    const slugs = getPublishedResourceSlugs();
    expect(slugs).toContain("what-is-edtech");
    expect(slugs).toContain("how-is-technology-changing-education");
  });

  it("loads article body and metadata for what-is-edtech", () => {
    const article = getResourceArticle("what-is-edtech");
    expect(article).not.toBeNull();
    expect(article?.published).toBe(true);
    expect(article?.pathname).toBe("/resources/what-is-edtech");
    expect(article?.datePublished).toBe("2026-07-28");
    expect(article?.dateModified).toBe("2026-07-28");
    expect(article?.body).toContain("What is EdTech?");
    expect(article?.relatedInternal).toContain("/teach-english-online");
    expect(article?.relatedInternal).not.toContain("/resources/news");
  });

  it("formats display dates for bylines", () => {
    expect(formatResourceDisplayDate("2026-07-28")).toBe("28 July 2026");
  });

  it("registers hub and articles for the sitemap", () => {
    const paths = getResourceSitemapSources().map((entry) => entry.path);
    expect(paths).toContain("/resources");
    expect(paths).toContain("/resources/what-is-edtech");
    expect(paths).toContain("/resources/how-is-technology-changing-education");
  });

  it("sorts published articles newest first", () => {
    const articles = listResourceArticles({ publishedOnly: true });
    expect(articles.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < articles.length; i += 1) {
      const prev = articles[i - 1]?.datePublished ?? articles[i - 1]?.dateModified ?? "";
      const curr = articles[i]?.datePublished ?? articles[i]?.dateModified ?? "";
      expect(prev >= curr).toBe(true);
    }
  });
});
