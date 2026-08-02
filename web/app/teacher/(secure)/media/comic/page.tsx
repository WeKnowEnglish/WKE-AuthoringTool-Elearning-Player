import { redirect } from "next/navigation";
import { ComicAdminWorkspace } from "@/components/comic/ComicAdminWorkspace";
import { getComicChapterForAdmin } from "@/lib/actions/comic";
import { isAdmin, isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TeacherComicMediaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isTeacher(user) || !isAdmin(user)) {
    redirect("/teacher/media");
  }

  const result = await getComicChapterForAdmin();
  if (!result.ok) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-5 text-sm font-semibold text-amber-950">
        {result.error}
        <p className="mt-2 font-normal text-amber-900/80">
          Apply Supabase migration{" "}
          <code className="rounded bg-amber-100 px-1">098_comic_reader.sql</code> and{" "}
          <code className="rounded bg-amber-100 px-1">101_comic_page_overlays.sql</code>, then refresh.
        </p>
      </div>
    );
  }

  return <ComicAdminWorkspace initialChapter={result.chapter} />;
}
