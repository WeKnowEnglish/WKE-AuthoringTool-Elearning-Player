"use client";

import { useEffect, useState } from "react";
import { kitFromJson, kitToPrettyJson } from "@/lib/character/kit/kit-storage";
import type { CharacterKitDocument } from "@/lib/character/kit/kit-types";

type Props = {
  kit: CharacterKitDocument;
  onApply: (next: CharacterKitDocument) => void;
};

export function CharacterKitJsonPanel({ kit, onApply }: Props) {
  const [text, setText] = useState(() => kitToPrettyJson(kit));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(kitToPrettyJson(kit));
    setError(null);
  }, [kit]);

  return (
    <fieldset className="space-y-2 rounded-xl border-2 border-[var(--pl-border)] bg-white p-3">
      <legend className="px-1 text-sm font-extrabold">Kit JSON</legend>
      <p className="text-xs text-[var(--pl-muted)]">
        Profile is the vinyl silhouette. <code>sculpts</code> are click-stamped brushes (inflate / pinch / flatten /
        move). Apply after you paste.
      </p>
      <textarea
        className="h-56 w-full resize-y rounded-lg border-2 border-[var(--pl-border)] bg-[#0f172a] p-2 font-mono text-xs text-[#e2e8f0]"
        spellCheck={false}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      {error ? <p className="text-xs font-semibold text-red-700">{error}</p> : null}
      <button
        type="button"
        className="w-full rounded-lg border-2 border-[var(--pl-ink)] bg-white px-3 py-2 text-sm font-bold"
        onClick={() => {
          try {
            onApply(kitFromJson(text));
            setError(null);
          } catch {
            setError("That JSON is not a valid kit document.");
          }
        }}
      >
        Apply JSON
      </button>
    </fieldset>
  );
}
