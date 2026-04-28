"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      setReady(true);
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    if (password.length < 8) {
      setMessage("Use at least 8 characters.");
      return;
    }
    if (password !== password2) {
      setMessage("Passwords do not match.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }
    await supabase.auth.signOut();
    router.push("/teacher/login?message=password_updated");
    router.refresh();
  }

  if (!ready) {
    return (
      <p className="text-sm text-neutral-600" role="status">
        Checking your reset link…
      </p>
    );
  }

  if (!hasSession) {
    return (
      <div className="space-y-3 text-sm text-neutral-700">
        <p>
          No active reset session. Open the password reset link from your email again, or request a
          new link from the sign-in page.
        </p>
        <p className="text-neutral-500">
          Links expire quickly and only work once. Make sure your app URL in Supabase matches this
          site (see README: Authentication → URL Configuration).
        </p>
        <Link href="/teacher/login" className="font-semibold text-blue-700 underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-4">
      <div>
        <label className="block text-sm font-medium" htmlFor="pw1">
          New password
        </label>
        <input
          id="pw1"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium" htmlFor="pw2">
          Confirm password
        </label>
        <input
          id="pw2"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
        />
      </div>
      {message ? (
        <p className="text-sm text-red-600" role="alert">
          {message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-neutral-900 py-2 font-semibold text-white [touch-action:manipulation] active:bg-neutral-950 disabled:opacity-60"
      >
        {loading ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
