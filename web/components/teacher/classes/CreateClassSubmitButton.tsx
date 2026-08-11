"use client";

import { useFormStatus } from "react-dom";

export function CreateClassSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="min-w-32 rounded bg-neutral-900 px-4 py-2 font-semibold text-white disabled:cursor-wait disabled:opacity-65"
    >
      {pending ? "Creating…" : "Create class"}
    </button>
  );
}
