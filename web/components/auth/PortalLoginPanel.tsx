"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { registerStudentAccount, updateStudentLearningBand } from "@/lib/actions/student-auth";
import { authCallbackRedirectUrl } from "@/lib/auth/auth-email-redirect";
import { migrateLocalStorageToStudentStorageId } from "@/lib/auth/student-storage-migrate";
import { resolvePostLoginPath } from "@/lib/auth/post-login-path";
import { getAppRole, mustChangePassword } from "@/lib/auth/roles";
import { resolveLearningBand } from "@/lib/auth/student-bands";
import { setStudentStorageIdCache } from "@/lib/auth/student-storage-id";
import { ensureMasteryHydratedForCurrentStudent, pushLocalMasteryBacklogForCurrentStudent } from "@/lib/mastery/supabase-sync";
import {
  normalizeUsername,
  usernameToStudentEmail,
} from "@/lib/auth/student-credentials";
import {
  learningBandLabel,
  type LearningBand,
} from "@/lib/learning-band";
import { writeLearningBandCookie } from "@/lib/learning-band-cookie";
import { setLearningBand } from "@/lib/progress/local-storage";
import { createClient } from "@/lib/supabase/client";
import { TeacherAccessRequestForm } from "@/components/auth/TeacherAccessRequestForm";
import { flushAppDiagnosticQueue, recordAppDiagnostic } from "@/lib/app-diagnostics/client";

export type PortalKind = "student" | "teacher";

type Props = {
  /**
   * Login door / sign-up track.
   * Sign-up uses this band. Sign-in uses the account's saved band for redirect.
   */
  learningBand?: LearningBand | null;
  /** When true, hide teacher tab (Secondary student portal). */
  studentOnly?: boolean;
  defaultPortal?: PortalKind;
  nextPath?: string;
  initialError?: string;
  initialMessage?: string;
  className?: string;
};

function formatAuthError(code: string | undefined): string {
  if (!code) return "";
  if (code === "not_teacher") return "That account is not a teacher.";
  const human: Record<string, string> = {
    invalid_credentials: "Wrong username or secret code.",
  };
  return human[code] ?? code.replace(/\+/g, " ");
}

export function PortalLoginPanel({
  learningBand,
  studentOnly = false,
  defaultPortal = "student",
  nextPath,
  initialError,
  initialMessage,
  className,
}: Props) {
  const router = useRouter();
  const [portal, setPortal] = useState<PortalKind>(studentOnly ? "student" : defaultPortal);
  const [studentMode, setStudentMode] = useState<"sign_in" | "sign_up">("sign_in");

  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");

  const [message, setMessage] = useState(() => formatAuthError(initialError));
  const [info, setInfo] = useState(() =>
    initialMessage === "password_updated" ?
      "Password updated. Sign in with your new password."
    : "",
  );
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [requestingTeacherAccess, setRequestingTeacherAccess] = useState(false);

  async function finishStudentSession(
    band: LearningBand,
    opts?: { persistBand?: boolean; authUserId?: string; migrateGuestProgress?: boolean },
  ) {
    if (opts?.authUserId) {
      setStudentStorageIdCache(opts.authUserId);
      if (opts.migrateGuestProgress) {
        migrateLocalStorageToStudentStorageId(opts.authUserId);
      }
      await ensureMasteryHydratedForCurrentStudent();
      if (opts.migrateGuestProgress) {
        await pushLocalMasteryBacklogForCurrentStudent();
      }
    }
    setLearningBand(band);
    writeLearningBandCookie(band);
    if (opts?.persistBand !== false) {
      await updateStudentLearningBand(band);
    }
    const path = resolvePostLoginPath({
      role: "student",
      learningBand: band,
      next: nextPath,
    });
    // Use a full request after sign-in so the Primary server component receives
    // the newly written Supabase auth cookies on its very first render.
    window.location.assign(path);
  }

  async function onStudentSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setInfo("");

    if (!username.trim()) {
      setMessage("Enter your username.");
      return;
    }
    if (!/^\d{4,6}$/.test(pin.trim())) {
      setMessage("Secret code must be 4–6 numbers.");
      return;
    }

    setLoading(true);
    recordAppDiagnostic("student", "authentication", "login_submitted", {
      portal: "student",
      mode: studentMode,
    }, { status: "started" });

    try {
      const normalized = normalizeUsername(username);
      const email = usernameToStudentEmail(normalized);
      const pinValue = pin.trim();
      const doorBand = learningBand ?? null;

      if (studentMode === "sign_up") {
        if (!doorBand) {
          setMessage("Pick Primary or Secondary on the home screen first.");
          return;
        }
        const registered = await registerStudentAccount({
          username,
          pin: pinValue,
          learningBand: doorBand,
        });
        if (!registered.ok) {
          setMessage(registered.error);
          return;
        }
      }

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: pinValue,
      });
      if (error) {
        recordAppDiagnostic("student", "authentication", "login_failed", {
          portal: "student",
          reason: "invalid_credentials",
        }, { kind: "error", status: "failed", errorCode: "invalid_credentials" });
        setMessage(
          studentMode === "sign_up" ?
            "Account created but sign-in failed. Try signing in."
          : "Wrong username or secret code.",
        );
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const role = getAppRole(user);
      if (role === "teacher") {
        await supabase.auth.signOut();
        setMessage("Use the Teacher tab to sign in with your email.");
        return;
      }
      if (role !== "student") {
        await supabase.auth.signOut();
        setMessage("This account cannot be used here.");
        return;
      }

      recordAppDiagnostic("student", "authentication", "login_succeeded", {
        portal: "student",
        mode: studentMode,
      }, { status: "succeeded" });
      await flushAppDiagnosticQueue();

      if (studentMode === "sign_up") {
        if (!doorBand) {
          setMessage("Pick Primary or Secondary on the home screen first.");
          return;
        }
        await finishStudentSession(doorBand, {
          persistBand: true,
          authUserId: user?.id,
          migrateGuestProgress: false,
        });
        return;
      }

      // Sign-in: account band drives redirect; login door cannot overwrite it.
      const accountBand = resolveLearningBand(user?.user_metadata?.learning_band);
      if (accountBand) {
        await finishStudentSession(accountBand, {
          persistBand: false,
          authUserId: user?.id,
          migrateGuestProgress: true,
        });
        return;
      }

      if (doorBand) {
        await finishStudentSession(doorBand, {
          persistBand: true,
          authUserId: user?.id,
          migrateGuestProgress: true,
        });
        return;
      }

      setMessage("Pick Primary or Secondary on the home screen first.");
      await supabase.auth.signOut();
    } catch {
      recordAppDiagnostic("student", "authentication", "login_failed", {
        portal: "student",
        reason: "connection_failed",
      }, { kind: "error", status: "failed", errorCode: "auth_connection_failed" });
      setMessage("We couldn't connect to the sign-in service. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onTeacherSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setInfo("");
    setLoading(true);
    recordAppDiagnostic("teacher", "authentication", "login_submitted", {
      portal: "teacher",
    }, { status: "started" });

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: teacherEmail.trim(),
        password: teacherPassword,
      });
      if (error) {
        recordAppDiagnostic("teacher", "authentication", "login_failed", {
          portal: "teacher",
          reason: "authentication_rejected",
        }, { kind: "error", status: "failed", errorCode: "teacher_auth_rejected" });
        setMessage(error.message);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (getAppRole(user) !== "teacher") {
        await supabase.auth.signOut();
        setMessage("This account is not a teacher.");
        return;
      }

      const path = resolvePostLoginPath({
        role: "teacher",
        next: nextPath,
        mustChangePassword: mustChangePassword(user),
      });
      recordAppDiagnostic("teacher", "authentication", "login_succeeded", {
        portal: "teacher",
      }, { status: "succeeded" });
      await flushAppDiagnosticQueue();
      router.push(path);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function sendTeacherReset(e: React.FormEvent) {
    e.preventDefault();
    setInfo("");
    setMessage("");
    if (!teacherEmail.trim()) {
      setMessage("Enter your email above, then click Forgot password.");
      return;
    }
    setResetLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(teacherEmail.trim(), {
        redirectTo: authCallbackRedirectUrl(
          "/teacher/reset-password",
          typeof window !== "undefined" ? window.location.origin : null,
        ),
      });
      if (error) {
        setMessage(error.message);
        return;
      }
      setInfo("Check your email for a reset link.");
    } finally {
      setResetLoading(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border-2 border-kid-ink px-3 py-2.5 text-base font-semibold text-kid-ink";

  return (
    <div className={clsx("space-y-4", className)}>
      {!studentOnly ?
        <div
          role="tablist"
          aria-label="Sign in as"
          className="flex rounded-xl border-2 border-kid-ink bg-white p-1"
        >
          {(["student", "teacher"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              role="tab"
              aria-selected={portal === kind}
              className={clsx(
                "min-h-11 flex-1 rounded-lg px-3 py-2 text-sm font-extrabold capitalize transition-colors [touch-action:manipulation]",
                portal === kind ?
                  "bg-[#f7bf4d] text-kid-ink"
                : "text-kid-ink/75 hover:bg-neutral-100",
              )}
              onClick={() => {
                setPortal(kind);
                setMessage("");
                setInfo("");
              }}
            >
              {kind === "student" ? "Student" : "Teacher"}
            </button>
          ))}
        </div>
      : null}

      {portal === "student" ?
        <>
          {learningBand ?
            <p className="text-center text-sm font-bold text-kid-ink">
              Path: <span className="text-lg">{learningBandLabel(learningBand)}</span>
            </p>
          : null}

          <div className="flex justify-center gap-2 text-sm font-bold">
            <button
              type="button"
              className={clsx(
                "rounded-lg border-2 px-3 py-1.5 [touch-action:manipulation]",
                studentMode === "sign_in" ?
                  "border-kid-ink bg-kid-panel"
                : "border-transparent text-kid-ink/70 underline",
              )}
              onClick={() => setStudentMode("sign_in")}
            >
              I&apos;m back
            </button>
            <button
              type="button"
              className={clsx(
                "rounded-lg border-2 px-3 py-1.5 [touch-action:manipulation]",
                studentMode === "sign_up" ?
                  "border-kid-ink bg-kid-panel"
                : "border-transparent text-kid-ink/70 underline",
              )}
              onClick={() => setStudentMode("sign_up")}
            >
              I&apos;m new
            </button>
          </div>

          <form onSubmit={onStudentSubmit} className="space-y-3" noValidate>
            <div>
              <label className="block text-sm font-bold" htmlFor="portal-username">
                Username
              </label>
              <input
                id="portal-username"
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={inputClass}
                placeholder="e.g. mai_dragon"
              />
            </div>
            <div>
              <label className="block text-sm font-bold" htmlFor="portal-pin">
                Secret code
              </label>
              <input
                id="portal-pin"
                type="password"
                required
                inputMode="numeric"
                autoComplete={studentMode === "sign_up" ? "new-password" : "current-password"}
                pattern="\d{4,6}"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className={inputClass}
                placeholder="4–6 numbers"
              />
            </div>
            {message ?
              <p className="text-sm font-semibold text-red-700" role="alert">
                {message}
              </p>
            : null}
            <KidButton type="submit" variant="accent" className="w-full" disabled={loading}>
              {loading ?
                "Please wait…"
              : studentMode === "sign_up" ?
                "Create account & go!"
              : "Sign in"}
            </KidButton>
          </form>
        </>
      : requestingTeacherAccess ?
        <TeacherAccessRequestForm onCancel={() => setRequestingTeacherAccess(false)} />
      : <form onSubmit={onTeacherSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium" htmlFor="portal-teacher-email">
              Email
            </label>
            <input
              id="portal-teacher-email"
              type="email"
              required
              autoComplete="email"
              value={teacherEmail}
              onChange={(e) => setTeacherEmail(e.target.value)}
              className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="portal-teacher-password">
              Password
            </label>
            <input
              id="portal-teacher-password"
              type="password"
              required
              autoComplete="current-password"
              value={teacherPassword}
              onChange={(e) => setTeacherPassword(e.target.value)}
              className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
            />
          </div>
          {message ?
            <p
              className={`text-sm ${message.includes("updated") ? "text-green-800" : "text-red-600"}`}
              role="alert"
            >
              {message}
            </p>
          : null}
          {info ?
            <p className="text-sm text-neutral-700" role="status">
              {info}
            </p>
          : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-neutral-900 py-2.5 font-semibold text-white [touch-action:manipulation] active:bg-neutral-950 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Teacher sign in"}
          </button>
          <div className="border-t border-neutral-200 pt-3">
            <button
              type="button"
              disabled={resetLoading}
              onClick={(e) => void sendTeacherReset(e)}
              className="w-full rounded border border-neutral-300 bg-white py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
            >
              {resetLoading ? "Sending…" : "Forgot password (email reset)"}
            </button>
            <p className="mt-3 text-center text-xs text-neutral-600">
              Teacher accounts are approved by an administrator.
            </p>
            <button
              type="button"
              onClick={() => {
                setRequestingTeacherAccess(true);
                setMessage("");
                setInfo("");
              }}
              className="mt-2 w-full rounded border border-neutral-300 bg-white py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
            >
              Request teacher access
            </button>
          </div>
        </form>
      }

      <p className="text-center text-xs text-kid-ink/70">
        <Link href="/" className="font-semibold underline">
          Back to path picker
        </Link>
      </p>
    </div>
  );
}
