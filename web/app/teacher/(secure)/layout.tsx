import Link from "next/link";
import { redirect } from "next/navigation";
import { teacherSignOut } from "@/lib/actions/auth";
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
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 bg-white px-4 py-3">
        <Link href="/teacher" className="font-bold">
          Teacher
        </Link>
        <div className="flex items-center gap-3 text-sm">
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
