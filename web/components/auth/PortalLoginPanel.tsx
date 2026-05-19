"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { registerStudentAccount, updateStudentLearningBand } from "@/lib/actions/student-auth";
import { resolvePostLoginPath } from "@/lib/auth/post-login-path";
import { getAppRole } from "@/lib/auth/roles";
import {
  normalizeUsername,
  usernameToStudentEmail,
} from "@/lib/auth/student-credentials";
import {
  isLearningBand,
  learningBandLabel,
  type LearningBand,
} from "@/lib/learning-band";
import { writeLearningBandCookie } from "@/lib/learning-band-cookie";
import { setLearningBand } from "@/lib/progress/local-storage";
import { createClient } from "@/lib/supabase/client";

export type PortalKind = "student" | "teacher";

type Props = {
  /** Level chosen on landing — required for new student accounts. */
  learningBand?: LearningBand | null;
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
  defaultPortal = "student",
  nextPath,
  initialError,
  initialMessage,
  className,
}: Props) {
  const router = useRouter();
  const [portal, setPortal] = useState<PortalKind>(defaultPortal);
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

  async function finishStudentSession(band: LearningBand) {
    setLearningBand(band);
    writeLearningBandCookie(band);
    await updateStudentLearningBand(band);
    const path = resolvePostLoginPath({ role: "student", next: nextPath });
    router.push(path);
    router.refresh();
  }

  async function onStudentSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setInfo("");
    setLoading(true);

    try {
      const normalized = normalizeUsername(username);
      const email = usernameToStudentEmail(normalized);
      const pinValue = pin.trim();

      if (studentMode === "sign_up") {
        if (!learningBand) {
          setMessage("Pick A1, A2, or B1 on the home screen first.");
          return;
        }
        const registered = await registerStudentAccount({
          username,
          pin: pinValue,
          learningBand,
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

      const metaBand = user?.user_metadata?.learning_band;
      const band: LearningBand | null =
        learningBand ?? (isLearningBand(metaBand) ? metaBand : null);
      if (!band) {
        setMessage("Pick A1, A2, or B1 on the home screen first.");
        return;
      }

      await finishStudentSession(band);
    } finally {
      setLoading(false);
    }
  }

  async function onTeacherSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setInfo("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: teacherEmail.trim(),
        password: teacherPassword,
      });
      if (error) {
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

      const path = resolvePostLoginPath({ role: "teacher", next: nextPath });
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
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.resetPasswordForEmail(teacherEmail.trim(), {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/teacher/reset-password")}`,
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

      {portal === "student" ?
        <>
          {learningBand ?
            <p className="text-center text-sm font-bold text-kid-ink">
              Level: <span className="text-lg">{learningBandLabel(learningBand)}</span>
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

          <form onSubmit={onStudentSubmit} className="space-y-3">
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
          </div>
        </form>
      }

      <p className="text-center text-xs text-kid-ink/70">
        <Link href="/" className="font-semibold underline">
          Back to level picker
        </Link>
      </p>
    </div>
  );
}
