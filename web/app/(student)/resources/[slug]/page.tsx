import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuthorByline } from "@/components/marketing/AuthorByline";
import { MarketingPageShell } from "@/components/marketing/MarketingPageShell";
import { PillarCtaRow } from "@/components/marketing/PillarCtaRow";
import { ResourceMarkdown } from "@/components/resources/ResourceMarkdown";
import { ResourceRelatedLinks } from "@/components/resources/ResourceRelatedLinks";
import {
  formatResourceDisplayDate,
  getPublishedResourceSlugs,
  getResourceArticle,
} from "@/lib/resources/load-articles";
import { buildPublicMetadata } from "@/lib/seo/build-metadata";
import { buildBreadcrumbJsonLd } from "@/lib/seo/json-ld";
import { SITE_NAME, SITE_URL } from "@/lib/seo/site";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getPublishedResourceSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getResourceArticle(slug);
  if (!article) {
    return buildPublicMetadata({
      title: "Resource not found",
      description: "This resource article is not available.",
      pathname: `/resources/${slug}`,
    });
  }

  return buildPublicMetadata({
    title: article.title,
    description: article.description,
    pathname: article.pathname,
  });
}

export default async function ResourceArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = getResourceArticle(slug);
  if (!article || !article.datePublished) notFound();

  const breadcrumbs = [
    { name: "Home", path: "/" },
    { name: "Resources", path: "/resources" },
    { name: article.title, path: article.pathname },
  ];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbs);
  const publishedLabel = formatResourceDisplayDate(article.datePublished);
  const modifiedLabel = formatResourceDisplayDate(article.dateModified);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    author: {
      "@type": "Person",
      name: article.author,
      url: `${SITE_URL}/about`,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    datePublished: article.datePublished,
    dateModified: article.dateModified,
    mainEntityOfPage: `${SITE_URL}${article.pathname}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <MarketingPageShell breadcrumbs={breadcrumbs}>
        <AuthorByline
          authorName={article.author}
          reviewStatus={article.reviewStatus}
          datePublished={publishedLabel}
          dateModified={modifiedLabel}
        />
        <ResourceMarkdown markdown={article.body} />
        <ResourceRelatedLinks paths={article.relatedInternal} />
        <PillarCtaRow
          primaryHref="/esl-activities-for-kids"
          primaryLabel="Explore free activities"
          secondaryHref="/teach-english-online"
          secondaryLabel="Teach online guide"
        />
      </MarketingPageShell>
    </>
  );
}
