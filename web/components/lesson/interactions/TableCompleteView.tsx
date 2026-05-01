"use client";

import Image from "next/image";
import { clsx } from "clsx";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import { speakText, speakTextAndWait } from "@/lib/audio/tts";
import { countKeywordMatchesInText } from "@/lib/essay-keyword-feedback";
import type { ScreenPayload } from "@/lib/lesson-schemas";
import { GuideBlock, NavProps, unopt, normalizeText } from "./shared";

export function TableCompleteView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "table_complete" }>;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps) {
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const ci = parsed.case_insensitive ?? true;
  const nw = parsed.normalize_whitespace ?? true;

  function check() {
    playSfx("tap", muted);
    const ok = parsed.rows.every((r) => {
      if (parsed.input_mode === "typing") {
        const val = typed[r.id] ?? "";
        return (r.accepted_answers ?? []).some((a) => normalizeText(a, ci, nw) === normalizeText(val, ci, nw));
      }
      return placed[r.id] === r.expected_token_id;
    });
    if (ok) onPass();
    else onWrong();
  }

  return (
    <div>
      <KidPanel>
        <p className="text-xl font-semibold">{parsed.prompt}</p>
        {parsed.input_mode === "tokens" && (parsed.token_bank?.length ?? 0) > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {parsed.token_bank!.map((t) => (
              <KidButton key={t.id} type="button" variant={selectedToken === t.id ? "primary" : "secondary"} disabled={passed} onClick={() => setSelectedToken(t.id)}>
                {t.label}
              </KidButton>
            ))}
          </div>
        ) : null}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className="border px-2 py-1">{parsed.left_column_label}</th>
                <th className="border px-2 py-1">{parsed.right_column_label}</th>
              </tr>
            </thead>
            <tbody>
              {parsed.rows.map((r) => (
                <tr key={r.id}>
                  <td className="border px-2 py-1">{r.prompt_text}</td>
                  <td className="border px-2 py-1">
                    {parsed.input_mode === "typing" ? (
                      <input
                        className="w-full rounded border px-2 py-1"
                        value={typed[r.id] ?? ""}
                        disabled={passed}
                        onChange={(e) => setTyped((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      />
                    ) : (
                      <button
                        type="button"
                        className="w-full rounded border-2 border-dashed px-2 py-1 text-left"
                        disabled={passed || !selectedToken}
                        onClick={() => selectedToken && setPlaced((prev) => ({ ...prev, [r.id]: selectedToken }))}
                      >
                        {(parsed.token_bank ?? []).find((t) => t.id === placed[r.id])?.label ?? "Tap to place token"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <KidButton type="button" disabled={passed} onClick={check}>Check</KidButton>
        </div>
      </KidPanel>
      <GuideBlock guide={parsed.guide} />
      <div className="mt-6 flex flex-wrap gap-3">
        {showBack ? <KidButton type="button" variant="secondary" onClick={onBack}>Back</KidButton> : null}
        <KidButton type="button" disabled={!passed} onClick={() => onNext()}>Next</KidButton>
      </div>
    </div>
  );
}
