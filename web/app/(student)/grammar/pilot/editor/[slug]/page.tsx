import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GrammarPosterEditorApp } from "@/components/grammar/poster/editor/GrammarPosterEditorApp";
import {
  loadPosterModuleForEditor,
  PosterEditorLoadError,
} from "@/lib/grammar-builder/editor/load-poster-module-for-editor";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const loaded = loadPosterModuleForEditor(slug);
    return {
      title: `Edit: ${loaded.title}`,
      robots: { index: false, follow: false },
    };
  } catch {
    return { title: "Grammar Poster Editor" };
  }
}

export default async function GrammarPosterEditorSlugRoutePage({ params }: Props) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { slug } = await params;

  let loaded;
  try {
    loaded = loadPosterModuleForEditor(slug);
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
    />
  );
}
