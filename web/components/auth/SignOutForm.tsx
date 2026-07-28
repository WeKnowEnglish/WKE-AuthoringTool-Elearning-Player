"use client";

import { clsx } from "clsx";
import { LogOut } from "lucide-react";
import { portalSignOut } from "@/lib/actions/portal-sign-out";
import { clearStudentStorageIdCache } from "@/lib/auth/student-storage-id";
import { signOutMasterySyncCleanup } from "@/lib/mastery/supabase-sync";

type Props = {
  label?: string;
  className?: string;
  buttonClassName?: string;
  /** Kid hub / primary dashboard / secondary desk / neutral text link. */
  variant?: "kid" | "primary" | "secondary" | "link";
};

export function SignOutForm({
  label = "Log out",
  className,
  buttonClassName,
  variant = "link",
}: Props) {
  return (
    <form
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        void (async () => {
          await signOutMasterySyncCleanup();
          clearStudentStorageIdCache();
          await portalSignOut();
        })();
      }}
    >
      <button
        type="submit"
        className={clsx(
          "[touch-action:manipulation]",
          variant === "kid" &&
            "rounded-md border-2 border-kid-ink bg-kid-panel px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-kid-ink transition-transform hover:bg-white active:scale-[0.97]",
          variant === "primary" &&
            "inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-bg)] px-3 py-2.5 text-sm font-extrabold text-[var(--pl-muted)] transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 active:scale-[0.98]",
          variant === "secondary" &&
            "rounded-md border border-[var(--sec-border,#cbd5e1)] bg-white px-3 py-1.5 text-sm font-semibold text-[var(--sec-ink,#1e293b)] transition hover:bg-[var(--sec-panel-muted,#eef2f7)] active:scale-[0.98]",
          variant === "link" &&
            "rounded px-1 text-red-700 underline hover:bg-red-50 active:bg-red-100",
          buttonClassName,
        )}
      >
        {variant === "primary" ? <LogOut className="h-4 w-4 shrink-0" aria-hidden /> : null}
        {label}
      </button>
    </form>
  );
}
