"use client";

import Link from "next/link";
import { useEffect } from "react";
import { recordAppDiagnostic } from "@/lib/app-diagnostics";
import type { StudentActionAuthFailure } from "@/lib/auth/student-action-auth";

export function StudentActionFailureNotice({
  failure,
  homeworkId,
  action,
  retainedWorkMessage,
  onRetry,
}: {
  failure: StudentActionAuthFailure;
  homeworkId: string;
  action: string;
  retainedWorkMessage?: string;
  onRetry?: () => void;
}) {
  useEffect(() => {
    recordAppDiagnostic(
      "student",
      "homework_auth",
      "homework_auth_failed",
      { action, recovery: failure.recovery },
      {
        homeworkId,
        status: failure.recovery,
        errorCode: failure.errorCode,
        kind: "error",
        route: window.location.pathname,
      },
    );
  }, [action, failure.errorCode, failure.recovery, homeworkId]);

  return (
    <div
      role="alert"
      className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 text-sm font-semibold text-amber-950"
    >
      <p>{failure.error}</p>
      {failure.recovery === "sign_in" && failure.recoveryPath ? (
        <Link
          href={failure.recoveryPath}
          className="mt-2 inline-flex min-h-11 items-center rounded-lg border-2 border-amber-800 bg-white px-3 font-extrabold text-amber-950 underline"
        >
          Sign in and return
        </Link>
      ) : null}
      {failure.recovery === "use_student_account" ? (
        <Link
          href={failure.recoveryPath ?? "/login?portal=student"}
          className="mt-2 inline-flex min-h-11 items-center rounded-lg border-2 border-amber-800 bg-white px-3 font-extrabold text-amber-950 underline"
        >
          Use a student account
        </Link>
      ) : null}
      {failure.recovery === "return_home" ? (
        <Link
          href="/"
          className="mt-2 inline-flex min-h-11 items-center rounded-lg border-2 border-amber-800 bg-white px-3 font-extrabold text-amber-950 underline"
        >
          Return home
        </Link>
      ) : null}
      {failure.recovery === "retry" && onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex min-h-11 items-center rounded-lg border-2 border-amber-800 bg-white px-3 font-extrabold text-amber-950 underline"
        >
          Try again
        </button>
      ) : null}
      {retainedWorkMessage ? (
        <p className="mt-1 text-xs font-bold">{retainedWorkMessage}</p>
      ) : null}
    </div>
  );
}
