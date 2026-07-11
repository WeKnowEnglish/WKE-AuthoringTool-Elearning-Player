import type { Metadata } from "next";
import { GrammarPosterEditorIndex } from "@/components/grammar/poster/editor/GrammarPosterEditorIndex";

export const metadata: Metadata = {
  title: "Grammar Posters — Teacher",
  description: "Edit grammar infographic posters for students.",
  robots: { index: false, follow: false },
};

export default function TeacherGrammarPostersPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Grammar Posters</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Fine-tune poster layout, themes, and card content. Save drafts or publish live for students.
        </p>
      </div>
      <GrammarPosterEditorIndex />
    </div>
  );
}
