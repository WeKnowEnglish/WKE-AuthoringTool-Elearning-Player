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
import { GuideBlock, NavProps, unopt } from "./shared";

export function FillBlanksView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "fill_blanks" }>;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      parsed.blanks.map((b: { id: string }): [string, string] => [b.id, ""]),
    ),
  );
  const [lockedCorrectIds, setLockedCorrectIds] = useState<Set<string>>(() => new Set());
  const [wrongHint, setWrongHint] = useState<string | null>(null);
  const blanksSignature = useMemo(
    () =>
      parsed.blanks
        .map((b) => `${b.id}:${b.acceptable.map((a) => a.trim().toLowerCase()).join("|")}`)
        .join("||"),
    [parsed.blanks],
  );

  useEffect(() => {
    queueMicrotask(() => {
      setAnswers(
        Object.fromEntries(parsed.blanks.map((b: { id: string }): [string, string] => [b.id, ""])),
      );
      setLockedCorrectIds(new Set());
      setWrongHint(null);
    });
  }, [parsed.template, blanksSignature]);

  const parts = useMemo((): { type: "text" | "blank"; value: string }[] => {
    const template = parsed.template;
    const re = /__([^_]+)__/g;
    const out: { type: "text" | "blank"; value: string }[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(template)) !== null) {
      if (m.index > last) {
        out.push({ type: "text", value: template.slice(last, m.index) });
      }
      out.push({ type: "blank", value: m[1] });
      last = m.index + m[0].length;
    }
    if (last < template.length) {
      out.push({ type: "text", value: template.slice(last) });
    }
    return out;
  }, [parsed.template]);

  function check() {
    playSfx("tap", muted);
    const nextLocked = new Set(lockedCorrectIds);
    const wrongIds: string[] = [];

    for (const b of parsed.blanks) {
      const raw = (answers[b.id] ?? "").trim();
      const norm = raw.toLowerCase().replace(/\s+/g, " ");
      const ok = b.acceptable.some(
        (a: string) => a.trim().toLowerCase().replace(/\s+/g, " ") === norm,
      );
      if (ok) nextLocked.add(b.id);
      else wrongIds.push(b.id);
    }

    setLockedCorrectIds(nextLocked);

    if (wrongIds.length > 0) {
      setAnswers((prev) => {
        const next = { ...prev };
        for (const id of wrongIds) {
          next[id] = "";
        }
        return next;
      });
      setWrongHint("Not quite yet. Correct words are locked in green. Try again for the empty blanks.");
      onWrong();
      return;
    }
    setWrongHint(null);
    onPass();
  }

  const imageFitClass = parsed.image_fit === "contain" ? "object-contain bg-white" : "object-cover";
  const imageSizeClass = parsed.image_size === "small" ? "max-w-xl" : "max-w-4xl";

  return (
    <div>
      {parsed.image_url ? (
        <div className={clsx("relative mb-4 aspect-video w-full overflow-hidden rounded-lg border-4 border-kid-ink", imageSizeClass)}>
          <Image
            src={parsed.image_url}
            alt=""
            fill
            className={imageFitClass}
            unoptimized={unopt(parsed.image_url)}
          />
        </div>
      ) : null}
      <KidPanel>
        {parsed.body_text ? (
          <p className="mb-4 text-lg">{parsed.body_text}</p>
        ) : null}
        <p className="mb-2 text-xl leading-relaxed">
          {parts.map((p, i) =>
            p.type === "text" ? (
              <span key={i}>{p.value}</span>
            ) : (
              <input
                key={i}
                type="text"
                disabled={passed || lockedCorrectIds.has(p.value)}
                value={answers[p.value] ?? ""}
                onChange={(e) =>
                  setAnswers((prev) => {
                    if (wrongHint) setWrongHint(null);
                    return { ...prev, [p.value]: e.target.value };
                  })
                }
                className={clsx(
                  "mx-1 inline-block w-28 rounded border-2 px-1 py-0.5 align-baseline text-lg",
                  lockedCorrectIds.has(p.value)
                    ? "border-emerald-700 bg-emerald-50 text-emerald-900"
                    : "border-neutral-800",
                )}
                aria-label={`Blank ${p.value}`}
              />
            ),
          )}
        </p>
        {parsed.word_bank && parsed.word_bank.length > 0 ? (
          <div className="mt-4">
            <p className="mb-2 font-semibold">Word bank</p>
            <p className="rounded-lg border-2 border-kid-ink/20 bg-kid-panel px-3 py-2 text-lg font-semibold text-neutral-800">
              {parsed.word_bank.join(" · ")}
            </p>
          </div>
        ) : null}
        {wrongHint ? (
          <p className="mt-3 rounded-md border-2 border-red-300 bg-red-50 px-3 py-2 text-base font-semibold text-red-900">
            {wrongHint}
          </p>
        ) : null}
        <div className="mt-4">
          <KidButton type="button" disabled={passed} onClick={check}>
            Check
          </KidButton>
        </div>
      </KidPanel>
      <GuideBlock guide={parsed.guide} />
      <div className="mt-6 flex flex-wrap gap-3">
        {showBack ? (
          <KidButton type="button" variant="secondary" onClick={onBack}>
            Back
          </KidButton>
        ) : null}
        <KidButton type="button" disabled={!passed} onClick={() => onNext()}>
          Next
        </KidButton>
      </div>
    </div>
  );
}
