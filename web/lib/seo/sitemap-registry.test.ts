import { describe, expect, it } from "vitest";
import {
  collectSitemapSources,
  filterSitemapSources,
  toSitemapEntries,
  type SitemapEntrySource,
} from "@/lib/seo/sitemap-registry";

describe("sitemap registry", () => {
  it("includes only published indexable non-parameterized URLs", () => {
    const sources: SitemapEntrySource[] = [
      { path: "/", published: true, indexable: true },
      { path: "/about", published: false, indexable: true },
      { path: "/login", published: true, indexable: false },
      { path: "/activities?topic=a", published: true, indexable: true, parameterized: true },
      { path: "/play/x", published: true, indexable: true, embed: true },
      { path: "/teacher/classes", published: true, indexable: true, authenticatedOnly: true },
    ];

    const urls = toSitemapEntries(sources).map((entry) => entry.url);
    expect(urls).toEqual(["https://weknowenglish.online"]);
  });

  it("never invents lastModified when omitted", () => {
    const entries = toSitemapEntries([
      { path: "/grammar", published: true, indexable: true },
    ]);
    expect(entries[0]?.lastModified).toBeUndefined();
  });

  it("preserves honest lastModified when provided", () => {
    const entries = toSitemapEntries([
      {
        path: "/grammar",
        published: true,
        indexable: true,
        lastModified: "2026-01-15",
      },
    ]);
    expect(entries[0]?.lastModified).toBe("2026-01-15");
  });

  it("collects homepage, trust pages, pillar guides, resources, grammar hub, and published grammar posters", () => {
    const filtered = filterSitemapSources(collectSitemapSources());
    const paths = filtered.map((entry) => entry.path);
    expect(paths).toContain("/");
    expect(paths).toContain("/about");
    expect(paths).toContain("/esl-activities-for-kids");
    expect(paths).toContain("/teach-english-online");
    expect(paths).toContain("/english-learning-for-kids-at-home");
    expect(paths).toContain("/resources");
    expect(paths).toContain("/resources/what-is-edtech");
    expect(paths).toContain("/resources/how-is-technology-changing-education");
    expect(paths).toContain("/grammar");
    expect(paths.some((path) => path.startsWith("/grammar/"))).toBe(true);
    expect(paths).not.toContain("/login");
    expect(paths).not.toContain("/pilots");
    expect(paths).not.toContain("/teacher/classes");
  });
});
