import { redirect } from "next/navigation";
import { GRAMMAR_TEACHER_EDITOR_INDEX_PATH } from "@/lib/grammar-builder/editor/grammar-editor-paths";

export default function GrammarPosterEditorRedirectPage() {
  redirect(GRAMMAR_TEACHER_EDITOR_INDEX_PATH);
}
