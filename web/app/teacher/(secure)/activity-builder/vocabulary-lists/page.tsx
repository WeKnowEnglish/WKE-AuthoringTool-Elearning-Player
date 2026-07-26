import { VocabularyListWorkspace } from "@/components/teacher/activity-builder/VocabularyListWorkspace";
import { studioOriginFromEnv } from "@/lib/activity-builder/catalog";
import { isTeacherLight } from "@/lib/auth/roles";
import { listPublishedPlatformSearchEntries } from "@/lib/data/platform-lexicon";
import { listMasterLexiconOverrides } from "@/lib/data/platform-lexicon-overrides";
import { listTeacherLexiconEntries } from "@/lib/data/teacher-lexicon";
import { createClient } from "@/lib/supabase/server";
import {
  applyMasterOverrides,
  mergePlatformSearchEntries,
} from "@/lib/vocabulary/platform-lexicon";
import { getPrimaryVocabularySearchEntries } from "@/lib/vocabulary/primary-candidates";

export const dynamic = "force-dynamic";

export default async function TeacherVocabularyListsPage() {
  const [teacherLexicon, publishedPlatform, masterOverrides, user] = await Promise.all([
    listTeacherLexiconEntries().catch(() => []),
    listPublishedPlatformSearchEntries().catch(() => []),
    listMasterLexiconOverrides().catch(() => []),
    createClient().then((supabase) =>
      supabase.auth.getUser().then(({ data }) => data.user),
    ),
  ]);

  const platformEntries = applyMasterOverrides(
    mergePlatformSearchEntries(getPrimaryVocabularySearchEntries(), publishedPlatform),
    masterOverrides,
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <VocabularyListWorkspace
        studioOrigin={studioOriginFromEnv()}
        initialPlatformEntries={platformEntries}
        initialTeacherLexicon={teacherLexicon}
        showLexiconReviewLink={!isTeacherLight(user)}
      />
    </div>
  );
}
