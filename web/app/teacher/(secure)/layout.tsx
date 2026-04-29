import Link from "next/link";
import { redirect } from "next/navigation";
import { teacherSignOut } from "@/lib/actions/auth";
import { TeacherPrimaryTabs } from "@/components/teacher/TeacherPrimaryTabs";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TeacherSecureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/teacher/login");
  }
  if (user.app_metadata?.role !== "teacher") {
    redirect("/teacher/login?error=not_teacher");
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="grid grid-cols-1 items-center gap-2 border-b border-neutral-200 bg-white px-4 py-3 md:grid-cols-[1fr_auto_1fr]">
        <Link href="/teacher" className="font-bold md:justify-self-start">
          Teacher
        </Link>
        <TeacherPrimaryTabs />
        <div className="flex items-center justify-start gap-3 text-sm md:justify-self-end">
          <span className="text-neutral-600">{user.email}</span>
          <Link href="/" className="text-blue-700 underline">
            Student site
          </Link>
          <form action={teacherSignOut}>
            <button
              type="submit"
              className="rounded px-1 text-red-700 underline hover:bg-red-50 active:bg-red-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <div className="w-full max-w-none bg-white px-4 py-8 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}
