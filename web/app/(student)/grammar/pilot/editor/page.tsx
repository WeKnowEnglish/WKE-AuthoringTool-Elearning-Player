import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GrammarPosterEditorIndex } from "@/components/grammar/poster/editor/GrammarPosterEditorIndex";

export const metadata: Metadata = {
  title: "Grammar Poster Editor (Author)",
  description: "Authoring tool for grammar infographic posters.",
  robots: { index: false, follow: false },
};

export default function GrammarPosterEditorRoutePage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <GrammarPosterEditorIndex />;
}
