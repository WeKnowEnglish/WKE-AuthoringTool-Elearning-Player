import { redirect } from "next/navigation";
import { SetPasswordForm } from "./SetPasswordForm";
import {
  isTeacher,
  LOGIN_PATH,
  mustChangePassword,
  TEACHER_DEFAULT_PATH,
} from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TeacherSetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`${LOGIN_PATH}?portal=teacher&next=/teacher/set-password`);
  }
  if (!isTeacher(user)) {
    redirect(`${LOGIN_PATH}?portal=teacher&error=not_teacher`);
  }
  if (!mustChangePassword(user)) {
    redirect(TEACHER_DEFAULT_PATH);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="rounded-lg border border-neutral-300 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Choose your password</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Your account was set up with a temporary password. Pick a new one before using the
          teacher portal. Enter it twice to confirm, and use Show if you want to check what you
          typed.
        </p>
        <SetPasswordForm />
      </div>
    </div>
  );
}
