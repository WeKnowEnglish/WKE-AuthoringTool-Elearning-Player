import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GrammarPosterPage } from "@/components/grammar/poster/GrammarPosterPage";
import { getGrammarCatalogEntry } from "@/lib/grammar-builder";
import { GrammarModuleLoadError } from "@/lib/grammar-builder/load-poster-module-by-slug";
import { loadPosterModuleBySlugAsync } from "@/lib/grammar-builder/resolve-poster-module";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

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

  const view = await loadPosterModuleBySlugAsync(slug).catch((error) => {
    if (error instanceof GrammarModuleLoadError) {
      notFound();
    }
    throw error;
  });

  return <GrammarPosterPage slug={slug} view={view} />;
}
