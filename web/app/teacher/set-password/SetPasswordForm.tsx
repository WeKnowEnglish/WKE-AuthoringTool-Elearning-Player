"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { completeTeacherPasswordInduction } from "@/lib/actions/teacher-password";
import { TEACHER_DEFAULT_PATH } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/client";

function PasswordField({
  id,
  label,
  value,
  onChange,
  visible,
  onToggleVisible,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
  autoComplete: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      <div className="mt-1 flex gap-2">
        <input
          id={id}
          type={visible ? "text" : "password"}
          required
          autoComplete={autoComplete}
          minLength={8}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded border border-neutral-300 px-3 py-2"
        />
        <button
          type="button"
          onClick={onToggleVisible}
          className="shrink-0 rounded border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          aria-pressed={visible}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}

export function SetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const result = await completeTeacherPasswordInduction({
        password,
        passwordConfirm,
      });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }

      const supabase = createClient();
      await supabase.auth.refreshSession();
      router.push(TEACHER_DEFAULT_PATH);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-4">
      <PasswordField
        id="new-password"
        label="New password"
        value={password}
        onChange={setPassword}
        visible={showPassword}
        onToggleVisible={() => setShowPassword((v) => !v)}
        autoComplete="new-password"
      />
      <PasswordField
        id="confirm-password"
        label="Confirm password"
        value={passwordConfirm}
        onChange={setPasswordConfirm}
        visible={showConfirm}
        onToggleVisible={() => setShowConfirm((v) => !v)}
        autoComplete="new-password"
      />
      <p className="text-xs text-neutral-500">Use at least 8 characters. Do not reuse the temporary password.</p>
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
        {loading ? "Saving…" : "Save password and continue"}
      </button>
    </form>
  );
}
