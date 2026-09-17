import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CharacterKitEditor } from "@/components/character-kit-editor/CharacterKitEditor";
import { isStudent, isTeacher, TEACHER_DEFAULT_PATH } from "@/lib/auth/roles";
import { studentLoginPath } from "@/lib/auth/student-login";
import { createClient } from "@/lib/supabase/server";
import { safeAppReturnHref } from "@/lib/world/play-avatar";

export const metadata: Metadata = {
  title: "Make my face | WKE World",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function PrimaryWorldFacePage({ searchParams }: Props) {
  const { next } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(studentLoginPath("a1", "/primary/world/face"));
  }
  if (isTeacher(user)) {
    redirect(TEACHER_DEFAULT_PATH);
  }
  if (!isStudent(user)) {
    redirect("/login?error=unknown_role");
  }

  return (
    <CharacterKitEditor
      returnHref={safeAppReturnHref(next, "/primary/world/play/cottage?inside=1")}
    />
  );
}
