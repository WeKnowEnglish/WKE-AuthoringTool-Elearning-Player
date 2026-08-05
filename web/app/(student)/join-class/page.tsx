import Link from "next/link";
import { redirect } from "next/navigation";
import { JoinClassForm } from "@/components/student-hub/JoinClassForm";
import { isStudent, isTeacher, TEACHER_DEFAULT_PATH } from "@/lib/auth/roles";
import {
  learningBandFromUser,
  resolveStudentHomePath,
} from "@/lib/student-classes/portal-paths";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ code?: string }>;
};

export default async function JoinClassPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const params = (await searchParams) ?? {};
    const code = typeof params.code === "string" ? params.code.trim() : "";
    const next =
      code.length > 0
        ? `/join-class?code=${encodeURIComponent(code)}`
        : "/join-class";
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  if (isTeacher(user)) {
    redirect(TEACHER_DEFAULT_PATH);
  }

  if (!isStudent(user)) {
    redirect("/login?error=unknown_role");
  }

  const params = (await searchParams) ?? {};
  const initialCode = typeof params.code === "string" ? params.code.trim() : "";

  const homeHref = resolveStudentHomePath(learningBandFromUser(user));
  const classroomBasePath = homeHref === "/secondary" ? "/secondary/class" : "/primary/class";

  return (
    <div className="min-h-dvh bg-[#f7bf4d] px-4 py-8 text-kid-ink">
      <div className="mx-auto max-w-lg space-y-6">
        <Link href={homeHref} className="text-sm font-semibold underline">
          ← Back to home
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold">Join a class</h1>
          <p className="mt-2 text-sm">
            Enter the 6-character code from your teacher. Your teacher will be able to see your
            progress in their class roster.
          </p>
        </div>
        <JoinClassForm
          homeHref={homeHref}
          classroomBasePath={classroomBasePath}
          initialCode={initialCode}
        />
      </div>
    </div>
  );
}
