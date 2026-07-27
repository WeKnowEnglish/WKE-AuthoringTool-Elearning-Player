import type { MetadataRoute } from "next";
import {
  collectSitemapSources,
  toSitemapEntries,
} from "@/lib/seo/sitemap-registry";

export default function sitemap(): MetadataRoute.Sitemap {
  return toSitemapEntries(collectSitemapSources());
}
