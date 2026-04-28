import Link from "next/link";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default function TeacherResetPasswordPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="rounded-lg border border-neutral-300 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Set a new password</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Use this page after you open the reset link from your email. If you arrived here without
          clicking that link, go back and use <strong>Forgot password</strong> on the sign-in page.
        </p>
        <ResetPasswordForm />
        <p className="mt-6 text-center text-sm">
          <Link href="/teacher/login" className="text-blue-700 underline">
            Teacher sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
