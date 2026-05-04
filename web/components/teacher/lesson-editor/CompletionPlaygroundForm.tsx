"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveLessonCompletionPlayground } from "@/lib/actions/teacher";
import { BookendPlaygroundEditor } from "@/components/teacher/lesson-editor/BookendPlaygroundEditor";
import { completionPlaygroundSchema, type CompletionPlayground } from "@/lib/lesson-schemas";

export type CompletionPlaygroundFormProps = {
  lessonId: string;
  moduleId: string;
  initialPlayground: CompletionPlayground | null;
};

export function CompletionPlaygroundForm({
  lessonId,
  moduleId,
  initialPlayground,
}: CompletionPlaygroundFormProps) {
  const router = useRouter();
  const [playground, setPlayground] = useState<CompletionPlayground | undefined>(
    initialPlayground ?? undefined,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setError(null);
    const fd = new FormData();
    if (!playground) {
      fd.set("completion_playground_json", "");
    } else {
      const parsed = completionPlaygroundSchema.safeParse(playground);
      if (!parsed.success) {
        setError(parsed.error.issues.map((i) => i.message).join("; "));
        return;
      }
      fd.set("completion_playground_json", JSON.stringify(parsed.data));
    }
    startTransition(async () => {
      try {
        await saveLessonCompletionPlayground(lessonId, moduleId, fd);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3">
      <BookendPlaygroundEditor
        value={playground}
        onChange={(pg) => {
          setError(null);
          setPlayground(pg);
        }}
        busy={pending}
        parseMessage={error}
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-neutral-800 px-3 py-2 text-sm font-semibold text-white active:bg-neutral-900 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save completion playground"}
      </button>
    </form>
  );
}
