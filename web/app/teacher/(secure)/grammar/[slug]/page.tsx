import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GrammarPosterEditorApp } from "@/components/grammar/poster/editor/GrammarPosterEditorApp";
import { PosterEditorLoadError } from "@/lib/grammar-builder/editor/load-poster-module-for-editor";
import { loadPosterModuleForEditorAsync } from "@/lib/grammar-builder/resolve-poster-module";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const loaded = await loadPosterModuleForEditorAsync(slug);
    return {
      title: `Edit: ${loaded.title} — Teacher`,
      robots: { index: false, follow: false },
    };
  } catch {
    return { title: "Grammar Poster Editor — Teacher" };
  }
}

export default async function TeacherGrammarPosterEditorPage({ params }: Props) {
  const { slug } = await params;

  let loaded;
  try {
    loaded = await loadPosterModuleForEditorAsync(slug);
  } catch (error) {
    if (error instanceof PosterEditorLoadError) {
      notFound();
    }
    throw error;
  }

  return (
    <GrammarPosterEditorApp
      slug={loaded.slug}
      title={loaded.title}
      sourceFile={loaded.sourceFile}
      initialModule={loaded.raw}
      persistedStatus={loaded.persistedStatus}
      contentSource={loaded.source}
    />
  );
}
