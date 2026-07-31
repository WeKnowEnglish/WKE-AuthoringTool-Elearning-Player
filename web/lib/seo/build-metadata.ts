import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/seo/canonical";
import { robotsIndexFollow } from "@/lib/seo/robots-policy";
import { SITE_NAME, SITE_URL } from "@/lib/seo/site";

type BuildPublicMetadataInput = {
  /** Page title segment; root layout template appends `| We Know English`. */
  title: string;
  description: string;
  /** Pathname without origin, e.g. `/grammar` or `/`. */
  pathname: string;
  /** When true, ignore the root title template. */
  absoluteTitle?: boolean;
  /** Override Open Graph / Twitter title (defaults to `title | SITE_NAME`). */
  openGraphTitle?: string;
  robots?: Metadata["robots"];
  openGraphImage?: string;
};

export function buildPublicMetadata({
  title,
  description,
  pathname,
  absoluteTitle = false,
  openGraphTitle,
  robots = robotsIndexFollow,
  openGraphImage,
}: BuildPublicMetadataInput): Metadata {
  const url = canonicalUrl(pathname);
  const resolvedTitle = absoluteTitle
    ? { absolute: title }
    : title;
  const socialTitle =
    openGraphTitle ?? (absoluteTitle ? title : `${title} | ${SITE_NAME}`);

  return {
    title: resolvedTitle,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: socialTitle,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
      locale: "en_US",
      ...(openGraphImage
        ? { images: [{ url: openGraphImage.startsWith("http") ? openGraphImage : `${SITE_URL}${openGraphImage}` }] }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
    },
    robots,
  };
}
