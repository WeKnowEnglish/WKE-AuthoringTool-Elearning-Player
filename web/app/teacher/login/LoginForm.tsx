"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  nextPath?: string;
  initialError?: string;
  initialMessage?: string;
};

function formatLoginError(code: string | undefined): string {
  if (!code) return "";
  if (code === "not_teacher") return "This account is not a teacher.";
  const human: Record<string, string> = {
    missing_supabase_env:
      "Server configuration is missing Supabase credentials. Check .env.local.",
    invalid_or_expired_link_missing_code:
      "That sign-in link is incomplete or expired. Request a new reset email.",
    invalid_or_expired_link:
      "That link is invalid or expired. Request a new password reset.",
  };
  if (human[code]) return human[code];
  return code.replace(/\+/g, " ");
}

export function LoginForm({ nextPath, initialError, initialMessage }: Props) {
  const router = useRouter();
  const next = nextPath ?? "/teacher";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(() => {
    if (initialMessage === "password_updated") {
      return "Password updated. Sign in with your new password.";
    }
    return formatLoginError(initialError);
  });
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.app_metadata?.role !== "teacher") {
      await supabase.auth.signOut();
      setMessage("This account is not a teacher.");
      setLoading(false);
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    setInfo("");
    setMessage("");
    if (!email.trim()) {
      setMessage("Enter your email above, then click Forgot password.");
      return;
    }
    setResetLoading(true);
    try {
      const supabase = createClient();
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/teacher/reset-password")}`,
        },
      );
      if (error) {
        setMessage(error.message);
        setResetLoading(false);
        return;
      }
      setInfo("Check your email for a reset link. It opens this site and then the new-password page.");
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label className="block text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
        />
      </div>
      {message ? (
        <p
          className={`text-sm ${message.includes("updated") ? "text-green-800" : "text-red-600"}`}
          role="alert"
        >
          {message}
        </p>
      ) : null}
      {info ? (
        <p className="text-sm text-neutral-700" role="status">
          {info}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-neutral-900 py-2 font-semibold text-white [touch-action:manipulation] active:bg-neutral-950 disabled:opacity-60"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
      <div className="border-t border-neutral-200 pt-4">
        <p className="text-center text-sm text-neutral-600">Forgot your password?</p>
        <button
          type="button"
          disabled={resetLoading}
          onClick={(e) => void sendReset(e)}
          className="mt-2 w-full rounded border border-neutral-300 bg-white py-2 text-sm font-semibold text-neutral-800 [touch-action:manipulation] hover:bg-neutral-50 active:bg-neutral-100 disabled:opacity-60"
        >
          {resetLoading ? "Sending…" : "Email me a reset link"}
        </button>
        <p className="mt-2 text-center text-xs text-neutral-500">
          Enter your email, then click the button. The link goes to{" "}
          <code className="rounded bg-neutral-100 px-1">/auth/callback</code> then the reset page.
        </p>
      </div>
    </form>
  );
}
