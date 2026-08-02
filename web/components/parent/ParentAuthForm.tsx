"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { safeParentPath } from "@/lib/parent/parent-routes";

type Props = {
  nextPath?: string;
  invitationMode?: boolean;
};

export function ParentAuthForm({ nextPath, invitationMode = false }: Props) {
  const [mode, setMode] = useState<"sign_in" | "create">("sign_in");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const destination = safeParentPath(nextPath);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail || !normalizedEmail.includes("@")) {
        setError("Enter a valid email address.");
        return;
      }
      if (password.length < 8) {
        setError("Password must contain at least 8 characters.");
        return;
      }

      const supabase = createClient();
      if (mode === "sign_in") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (signInError) {
          setError("Email or password is incorrect.");
          return;
        }
        window.location.assign(destination);
        return;
      }

      if (displayName.trim().length < 2) {
        setError("Enter your name.");
        return;
      }
      const origin = window.location.origin;
      const callback = `${origin}/auth/callback?next=${encodeURIComponent(destination)}`;
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: callback,
          data: { display_name: displayName.trim() },
        },
      });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      if (data.session) {
        window.location.assign(destination);
        return;
      }
      setMessage(
        "Check your email to verify your account, then return to this invitation and sign in.",
      );
    } catch {
      setError("We could not connect to the sign-in service. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex rounded-xl bg-slate-100 p-1" aria-label="Parent account mode">
        <button
          type="button"
          onClick={() => {
            setMode("sign_in");
            setError("");
            setMessage("");
          }}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${
            mode === "sign_in" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("create");
            setError("");
            setMessage("");
          }}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${
            mode === "create" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"
          }`}
        >
          Create account
        </button>
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        {mode === "create" ? (
          <label className="block text-sm font-bold text-slate-800">
            Your name
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              autoComplete="name"
              required
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal"
            />
          </label>
        ) : null}
        <label className="block text-sm font-bold text-slate-800">
          Email address
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
            className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal"
          />
        </label>
        <label className="block text-sm font-bold text-slate-800">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === "create" ? "new-password" : "current-password"}
            minLength={8}
            required
            className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal"
          />
        </label>

        <p aria-live="polite" className="min-h-5 text-sm">
          {error ? <span className="text-red-700">{error}</span> : null}
          {!error && message ? <span className="text-emerald-700">{message}</span> : null}
        </p>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
        >
          {busy
            ? "Please wait…"
            : mode === "create"
              ? invitationMode
                ? "Create account and continue"
                : "Create parent account"
              : invitationMode
                ? "Sign in and continue"
                : "Sign in to parent portal"}
        </button>
      </form>

      {invitationMode ? (
        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          Use the exact email address that received the invitation. Your email must be verified
          before student access can be activated.
        </p>
      ) : null}
    </div>
  );
}
