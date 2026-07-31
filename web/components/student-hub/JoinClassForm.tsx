"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { joinClassByCode } from "@/lib/actions/student-classes";
import { JOIN_CODE_LENGTH, normalizeJoinCode } from "@/lib/teacher-classes/join-code";
import { recordAppDiagnostic } from "@/lib/app-diagnostics/client";

export function JoinClassForm({
  onJoined,
  homeHref,
  classroomBasePath,
}: {
  onJoined?: (result: { classId: string; title: string }) => void;
  /** After a successful join from the standalone page, return here. */
  homeHref?: string;
  /** After joining, open the newly joined classroom directly. */
  classroomBasePath?: "/primary/class" | "/secondary/class";
} = {}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    setSuccess(null);
    recordAppDiagnostic("student", "class", "class_join_submitted", undefined, {
      status: "started",
    });
    startTransition(async () => {
      const result = await joinClassByCode(code);
      if (!result.ok) {
        recordAppDiagnostic("student", "class", "class_join_failed", {
          reason: result.error,
        }, { kind: "error", status: "failed", errorCode: "class_join_rejected" });
        setError(result.error);
        return;
      }
      setSuccess(`You joined "${result.title}".`);
      recordAppDiagnostic("student", "class", "class_joined", {
        classTitle: result.title,
      }, { classId: result.classId, status: "succeeded" });
      setCode("");
      onJoined?.({ classId: result.classId, title: result.title });
      if (classroomBasePath) {
        router.push(`${classroomBasePath}/${encodeURIComponent(result.classId)}`);
        return;
      }
      if (homeHref) {
        router.push(homeHref);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="mx-auto max-w-md space-y-4">
      <label className="block text-sm font-bold text-kid-ink" htmlFor="join-code">
        Class code
      </label>
      <input
        id="join-code"
        value={code}
        onChange={(event) => setCode(normalizeJoinCode(event.target.value).slice(0, JOIN_CODE_LENGTH))}
        placeholder="6-character code"
        className="w-full rounded-lg border-2 border-kid-ink px-3 py-2 font-mono text-lg tracking-widest"
        autoComplete="off"
        spellCheck={false}
      />
      <button
        type="button"
        disabled={isPending}
        onClick={submit}
        className="w-full rounded-lg border-2 border-kid-ink bg-kid-panel px-4 py-2 font-bold disabled:opacity-50"
      >
        {isPending ? "Joining…" : "Join class"}
      </button>
      {error ? (
        <p className="text-sm font-semibold text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm font-semibold text-emerald-900" role="status">
          {success}
        </p>
      ) : null}
    </div>
  );
}
