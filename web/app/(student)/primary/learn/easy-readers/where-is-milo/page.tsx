import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EasyReaderPlayer } from "@/components/easy-readers/EasyReaderPlayer";
import { bookTwo } from "@/content/easy-readers/book-2";
import { isStudent, isTeacher, TEACHER_DEFAULT_PATH } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Where Is Milo? | Primary Learn",
  description: bookTwo.description,
  robots: { index: false, follow: false },
};

const readerPath = "/primary/learn/easy-readers/where-is-milo";

export default async function PrimaryWhereIsMiloPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=${readerPath}`);
  if (isTeacher(user)) redirect(TEACHER_DEFAULT_PATH);
  if (!isStudent(user)) redirect("/login?error=unknown_role");

  return <EasyReaderPlayer book={bookTwo} />;
}
