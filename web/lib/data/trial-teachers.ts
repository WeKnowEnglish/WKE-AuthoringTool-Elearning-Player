import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { teacherSpacePublicPath } from "@/lib/teacher-space/paths";

export type TrialTeacherListing = {
  handle: string;
  title: string;
  bio: string;
  publicPath: string;
  bookPath: string;
};

export async function listTeachersAcceptingTrials(): Promise<TrialTeacherListing[]> {
  noStore();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teacher_spaces")
    .select("handle, title, bio, trials_enabled, is_published")
    .eq("is_published", true)
    .eq("trials_enabled", true)
    .order("title", { ascending: true })
    .limit(48);

  if (error) {
    const message = (error.message ?? "").toLowerCase();
    if (
      message.includes("trials_enabled") ||
      message.includes("teacher_spaces") ||
      error.code === "42703" ||
      error.code === "PGRST204"
    ) {
      return [];
    }
    throw error;
  }

  return (data ?? []).map((row) => {
    const handle = String(row.handle);
    return {
      handle,
      title: String(row.title),
      bio: String(row.bio ?? ""),
      publicPath: teacherSpacePublicPath(handle),
      bookPath: `/parent/book-trial/wke/${handle}`,
    };
  });
}
