"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { CircleCheck, CircleDashed, PencilLine } from "lucide-react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import {
  checkPictureWritingResponse,
  isPictureWritingPromptReady,
  type PictureWritingCheck,
  type PictureWritingPlayable,
} from "@/lib/picture-writing";

type Stage = "activity" | "review";

type Props = {
  activity: PictureWritingPlayable;
  eyebrow?: string;
  onReady?: () => void;
};

export function PictureWritingPlayer({
  activity,
  eyebrow = "Picture writing",
  onReady,
}: Props) {
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [stage, setStage] = useState<Stage>("activity");

  const checks = useMemo(
    () =>
      Object.fromEntries(
        activity.prompts.map((prompt) => [
          prompt.id,
          checkPictureWritingResponse(responses[prompt.id] ?? "", prompt),
        ]),
      ) as Record<string, PictureWritingCheck>,
    [activity.prompts, responses],
  );
  const allReady =
    checked &&
    activity.prompts.every((prompt) => isPictureWritingPromptReady(checks[prompt.id]!));

  if (stage === "review") {
    return (
      <KidPanel className="bg-white text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-sky-100 text-sky-700">
          <PencilLine className="h-14 w-14" />
        </div>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-sky-700">
          Review
        </p>
        <h2 className="mt-2 text-3xl font-black text-kid-ink">
          Writing ready for teacher review
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-lg font-bold text-kid-ink/70">
          All {activity.prompts.length} responses meet the basic writing checks. Your
          teacher can now review meaning, grammar, and sentence quality.
        </p>
        <div className="mx-auto mt-6 max-w-3xl space-y-3 text-left">
          {activity.prompts.map((prompt, index) => (
            <div
              key={prompt.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                Response {index + 1}
              </p>
              <p className="mt-1 font-semibold leading-7 text-slate-800">
                {responses[prompt.id]}
              </p>
              <span className="mt-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">
                Teacher review pending
              </span>
            </div>
          ))}
        </div>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <KidButton
            variant="secondary"
            onClick={() => {
              setStage("activity");
              setChecked(false);
            }}
          >
            Edit my writing
          </KidButton>
          {onReady ? <KidButton onClick={onReady}>Done</KidButton> : null}
        </div>
      </KidPanel>
    );
  }

  return (
    <div className="space-y-4">
      <KidPanel className="bg-white">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-sky-100 p-3 text-sky-800">
            <PencilLine className="h-8 w-8" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700">
              {eyebrow}
            </p>
            <h2 className="mt-1 text-2xl font-black text-kid-ink">{activity.title}</h2>
            <p className="mt-1 font-semibold text-kid-ink/70">{activity.instructions}</p>
          </div>
        </div>
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950">
          The helper checks sentence basics. Your teacher checks whether your ideas and
          grammar communicate clearly.
        </p>
      </KidPanel>

      {activity.prompts.map((prompt, index) => {
        const result = checks[prompt.id]!;
        const ready = isPictureWritingPromptReady(result);
        return (
          <article
            key={prompt.id}
            className={`overflow-hidden rounded-2xl border-4 bg-white shadow-[4px_4px_0_0_#bfdbfe] ${
              checked
                ? ready
                  ? "border-emerald-500"
                  : "border-amber-400"
                : "border-[#17375e]"
            }`}
          >
            <div className="grid md:grid-cols-[18rem_minmax(0,1fr)]">
              <Image
                unoptimized
                src={prompt.imageUrl}
                alt={prompt.imageAlt}
                width={640}
                height={400}
                className="h-full min-h-56 w-full bg-sky-50 object-contain"
              />
              <div className="space-y-4 p-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-sky-700">
                    Picture {index + 1}
                  </p>
                  <h3 className="mt-1 text-xl font-black text-[#17375e]">
                    {prompt.question}
                  </h3>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Prompt words
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {prompt.promptWords.map((word) => (
                      <span
                        key={word}
                        className="rounded-lg bg-sky-100 px-3 py-1.5 text-sm font-black text-sky-900"
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
                {prompt.sentenceStarter ? (
                  <p className="text-sm font-bold text-slate-600">
                    You may start:{" "}
                    <strong className="text-[#17375e]">
                      {prompt.sentenceStarter}…
                    </strong>
                  </p>
                ) : null}
                <label className="block text-sm font-black text-slate-700">
                  Your complete sentence
                  <textarea
                    rows={3}
                    value={responses[prompt.id] ?? ""}
                    onChange={(event) => {
                      setResponses((current) => ({
                        ...current,
                        [prompt.id]: event.target.value,
                      }));
                      setChecked(false);
                    }}
                    className="mt-2 w-full rounded-xl border-2 border-sky-300 bg-sky-50 px-4 py-3 text-base font-semibold leading-7 text-slate-800 focus:border-sky-600 focus:outline-none focus:ring-4 focus:ring-sky-100"
                  />
                </label>
                <p className="text-xs font-bold text-slate-500">
                  {result.wordCount} words · at least {prompt.minWords}
                </p>
                {checked ? <WritingChecklist result={result} /> : null}
              </div>
            </div>
          </article>
        );
      })}

      <KidPanel className="flex flex-wrap items-center justify-between gap-3 bg-white">
        <p className="text-sm font-semibold text-kid-ink/70">
          {activity.prompts.length} picture
          {activity.prompts.length === 1 ? "" : "s"}
        </p>
        {allReady ? (
          <KidButton onClick={() => setStage("review")}>
            Send for teacher review
          </KidButton>
        ) : (
          <KidButton
            disabled={activity.prompts.some(
              (prompt) => !(responses[prompt.id] ?? "").trim(),
            )}
            onClick={() => setChecked(true)}
          >
            {checked ? "Check again" : "Check my writing"}
          </KidButton>
        )}
      </KidPanel>
    </div>
  );
}

function WritingChecklist({ result }: { result: PictureWritingCheck }) {
  const rows = [
    ["Capital letter", result.capitalLetter],
    ["Ending punctuation", result.endingPunctuation],
    ["Enough words", result.minimumWords],
    ["Required prompt words", result.requiredWords],
  ] as const;
  return (
    <div className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
      {rows.map(([label, pass]) => (
        <p
          key={label}
          className={`flex items-center gap-2 text-xs font-black ${
            pass ? "text-emerald-800" : "text-amber-900"
          }`}
        >
          {pass ? <CircleCheck className="h-4 w-4" /> : <CircleDashed className="h-4 w-4" />}
          {label}
        </p>
      ))}
    </div>
  );
}
