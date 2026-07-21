import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WordPackEditorClient } from "@/components/teacher/word-packs/WordPackEditorClient";
import { isAdmin, isTeacherLight } from "@/lib/auth/roles";
import { listTeacherClasses } from "@/lib/data/teacher-classes";
import { listPublishedPlatformSearchEntries } from "@/lib/data/platform-lexicon";
import { listMasterLexiconOverrides } from "@/lib/data/platform-lexicon-overrides";
import {
  getTeacherLexiconEntriesByIds,
  listTeacherLexiconEntries,
} from "@/lib/data/teacher-lexicon";
import { getTeacherWordPack } from "@/lib/data/teacher-word-packs";
import { createClient } from "@/lib/supabase/server";
import { mergeTeacherLexiconForPack } from "@/lib/vocabulary/teacher-lexicon";
import { mergePlatformSearchEntries } from "@/lib/vocabulary/platform-lexicon";
import { getPrimaryVocabularySearchEntries } from "@/lib/vocabulary/primary-candidates";

type Props = {
  params: Promise<{ packId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { packId } = await params;
  const pack = await getTeacherWordPack(packId);
  return {
    title: pack ? `${pack.title} — Word pack` : "Word pack",
    robots: { index: false, follow: false },
  };
}

export default async function TeacherWordPackEditorPage({ params, searchParams }: Props) {
  const { packId } = await params;
  const sp = (await searchParams) ?? {};
  const error = firstParam(sp.error) || null;
  const pack = await getTeacherWordPack(packId);
  if (!pack || pack.archived_at) notFound();

  const [classes, activeLexicon, packLexicon, publishedPlatform, masterOverrides, user] =
    await Promise.all([
      listTeacherClasses(),
      listTeacherLexiconEntries().catch(() => []),
      getTeacherLexiconEntriesByIds(pack.word_ids).catch(() => []),
      listPublishedPlatformSearchEntries().catch(() => []),
      listMasterLexiconOverrides().catch(() => []),
      createClient().then((supabase) =>
        supabase.auth.getUser().then(({ data }) => data.user),
      ),
    ]);

  const teacherLexicon = mergeTeacherLexiconForPack(activeLexicon, packLexicon);
  const platformEntries = mergePlatformSearchEntries(
    getPrimaryVocabularySearchEntries(),
    publishedPlatform,
  );

  return (
    <WordPackEditorClient
      pack={pack}
      classes={classes.filter((c) => !c.archived_at).map((c) => ({ id: c.id, title: c.title }))}
      initialError={error}
      initialTeacherLexicon={teacherLexicon}
      initialPlatformEntries={platformEntries}
      initialMasterOverrides={masterOverrides}
      canEditMaster={isAdmin(user)}
      showLexiconReviewLink={!isTeacherLight(user)}
    />
  );
}
