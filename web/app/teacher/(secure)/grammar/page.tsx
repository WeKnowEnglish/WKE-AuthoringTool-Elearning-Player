import type { Metadata } from "next";
import { GrammarPosterEditorIndex } from "@/components/grammar/poster/editor/GrammarPosterEditorIndex";

export const metadata: Metadata = {
  title: "Grammar Poster Editor — Teacher",
  description:
    "One editor for grammar posters. Start from There is / There are or open another template variation.",
  robots: { index: false, follow: false },
};

export default function TeacherGrammarPostersPage() {
  return (
    <div className="space-y-4">
      <GrammarPosterEditorIndex />
    </div>
  );
}
