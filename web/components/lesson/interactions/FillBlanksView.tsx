"use client";

import Image from "next/image";
import { clsx } from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import type { ScreenPayload } from "@/lib/lesson-schemas";
import {
  GuideBlock,
  interactionImageFitClass,
  interactionHeroImageFrameStyle,
  InteractionLessonNav,
  interactionNavReservePaddingClass,
  NavProps,
  unopt,
} from "./shared";

export function FillBlanksView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
  /** When true, Enter in a blank runs Check (if not passed). */
  submitOnEnter,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "fill_blanks" }>;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
  submitOnEnter?: boolean;
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
  const wordBankSignature = useMemo(() => (parsed.word_bank ?? []).join("|"), [parsed.word_bank]);

  useEffect(() => {
    queueMicrotask(() => {
      setAnswers(
        Object.fromEntries(parsed.blanks.map((b: { id: string }): [string, string] => [b.id, ""])),
      );
      setLockedCorrectIds(new Set());
      setWrongHint(null);
    });
  }, [parsed.template, blanksSignature, wordBankSignature]);

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

  const pickTargetBlankId = useCallback((): string | null => {
    if (passed) return null;
    let firstEditable: string | null = null;
    for (const p of parts) {
      if (p.type !== "blank") continue;
      const id = p.value;
      if (lockedCorrectIds.has(id)) continue;
      if (firstEditable === null) firstEditable = id;
      if (!(answers[id] ?? "").trim()) return id;
    }
    return firstEditable;
  }, [parts, answers, lockedCorrectIds, passed]);

  const applyWordFromBank = useCallback(
    (word: string) => {
      if (passed) return;
      const id = pickTargetBlankId();
      if (!id) return;
      playSfx("tap", muted);
      setWrongHint(null);
      setAnswers((prev) => ({ ...prev, [id]: word }));
    },
    [passed, muted, pickTargetBlankId],
  );

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
      setWrongHint(
        parsed.word_bank?.length
          ? "Not quite yet. Correct words stay green. Use the word box or type, then tap Check."
          : "Not quite yet. Correct words are locked in green. Try again for the empty blanks.",
      );
      onWrong();
      return;
    }
    setWrongHint(null);
    onPass();
  }

  const imageSizeClass = parsed.image_size === "small" ? "max-w-xl" : "max-w-4xl";

  return (
    <div className={interactionNavReservePaddingClass}>
      {parsed.image_url ? (
        <div
          className={clsx(
            "relative mb-3 w-full overflow-hidden rounded-lg border-4 border-kid-ink",
            imageSizeClass,
          )}
          style={interactionHeroImageFrameStyle}
        >
          <Image
            src={parsed.image_url}
            alt=""
            fill
            className={interactionImageFitClass(parsed.image_fit)}
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
                onKeyDown={(e) => {
                  if (!submitOnEnter || passed) return;
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  if (lockedCorrectIds.has(p.value)) return;
                  check();
                }}
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
          <div
            className="mt-4 rounded-xl border-2 border-kid-ink/25 bg-kid-surface-muted/40 px-3 py-3"
            role="group"
            aria-label="Word choices"
          >
            <p className="mb-1 font-semibold text-kid-ink">Word box</p>
            <p className="mb-3 text-sm text-neutral-700">Tap a word to fill the blank. You can still type instead.</p>
            <div className="flex flex-wrap gap-2">
              {parsed.word_bank.map((w, i) => (
                <KidButton
                  key={`${w}-${i}`}
                  type="button"
                  variant="secondary"
                  disabled={passed || pickTargetBlankId() === null}
                  className="!min-h-11 !min-w-[3.25rem] px-3 py-2 text-base font-bold"
                  onClick={() => applyWordFromBank(w)}
                >
                  {w}
                </KidButton>
              ))}
            </div>
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
      <InteractionLessonNav showBack={showBack} onBack={onBack} passed={passed} onNext={onNext} />
    </div>
  );
}
