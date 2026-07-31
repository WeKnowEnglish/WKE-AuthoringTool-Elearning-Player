import { WkeLibraryBrowse } from "@/components/teacher/wke-library/WkeLibraryBrowse";
import { isAdmin } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { listTeacherClasses } from "@/lib/data/teacher-classes";

export const dynamic = "force-dynamic";

export default async function TeacherWkeLibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const classes = await listTeacherClasses();

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-sky-50/40 to-stone-50">
      <WkeLibraryBrowse
        isAdmin={isAdmin(user)}
        classes={classes.filter((item) => !item.archived_at).map((item) => ({ id: item.id, title: item.title }))}
      />
    </div>
  );
}
