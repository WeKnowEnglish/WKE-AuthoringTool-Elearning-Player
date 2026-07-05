import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GrammarPosterPage } from "@/components/grammar/poster/GrammarPosterPage";
import {
  getGrammarCatalogEntry,
  getPublishedGrammarSlugs,
  loadPosterModuleBySlug,
} from "@/lib/grammar-builder";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getPublishedGrammarSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = getGrammarCatalogEntry(slug);

  if (!entry || entry.status !== "published") {
    return {};
  }

  return {
    title: `${entry.title} — Grammar`,
    description: entry.description ?? `Learn ${entry.title}.`,
  };
}

export default async function GrammarPosterRoutePage({ params }: Props) {
  const { slug } = await params;
  const entry = getGrammarCatalogEntry(slug);

  if (!entry || entry.status !== "published") {
    notFound();
  }

  const { hero, sections, pageLayout } = loadPosterModuleBySlug(slug);

  return (
    <GrammarPosterPage hero={hero} sections={sections} pageLayout={pageLayout} />
  );
}
