import { redirect } from "next/navigation";
import { grammarTeacherEditorSlugPath } from "@/lib/grammar-builder/editor/grammar-editor-paths";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function GrammarPosterEditorSlugRedirectPage({ params }: Props) {
  const { slug } = await params;
  redirect(grammarTeacherEditorSlugPath(slug));
}
