import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EasyReaderPlayer } from "@/components/easy-readers/EasyReaderPlayer";
import { bookOne } from "@/content/easy-readers/book-1";
import { isStudent, isTeacher, TEACHER_DEFAULT_PATH } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "The New Student | Primary Learn",
  description: bookOne.description,
  robots: { index: false, follow: false },
};

const readerPath = "/primary/learn/easy-readers/the-new-student";

export default async function PrimaryTheNewStudentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=${readerPath}`);
  if (isTeacher(user)) redirect(TEACHER_DEFAULT_PATH);
  if (!isStudent(user)) redirect("/login?error=unknown_role");

  return (
    <EasyReaderPlayer
      book={bookOne}
      backHref="/primary?nav=learn"
      backLabel="Back to Learn"
    />
  );
}
