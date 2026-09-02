"use client";

import type { HomeworkCollectionCreativePresentationPart } from "@/lib/homework-collections";

type Props = {
  part: HomeworkCollectionCreativePresentationPart;
  onChange: (part: HomeworkCollectionCreativePresentationPart) => void;
};

const fieldClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-900";

export function CreativePresentationPartEditor({ part, onChange }: Props) {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-teal-200 bg-teal-50 p-4">
        <p className="text-xs font-extrabold uppercase tracking-wide text-teal-800">
          Ready-made VLOG demo
        </p>
        <p className="mt-1 text-sm font-semibold leading-6 text-teal-950">
          Students see one simple step at a time. The layout, photo spaces, drawing
          tools, and finished presentation are already prepared.
        </p>
      </section>

      <StepEditor
        number={1}
        title="Your VLOG idea"
        question={part.idea.question}
        direction={part.idea.direction}
        onQuestion={(question) => onChange({ ...part, idea: { ...part.idea, question } })}
        onDirection={(direction) => onChange({ ...part, idea: { ...part.idea, direction } })}
      >
        <SentenceStarters
          values={part.idea.starters}
          onChange={(starters) => onChange({ ...part, idea: { ...part.idea, starters } })}
        />
      </StepEditor>

      <StepEditor
        number={2}
        title="Your video plan"
        question={part.plan.question}
        direction={part.plan.direction}
        onQuestion={(question) => onChange({ ...part, plan: { ...part.plan, question } })}
        onDirection={(direction) => onChange({ ...part, plan: { ...part.plan, direction } })}
      >
        <div className="grid gap-2 sm:grid-cols-3">
          {part.plan.fields.map((field, index) => (
            <div key={field.id} className="rounded-lg border border-stone-200 bg-stone-50 p-2.5">
              <label className="block text-[11px] font-bold text-stone-700">
                Question {index + 1}
                <input
                  value={field.label}
                  onChange={(event) => {
                    const fields = part.plan.fields.map((entry) =>
                      entry.id === field.id ? { ...entry, label: event.target.value } : entry,
                    );
                    onChange({ ...part, plan: { ...part.plan, fields } });
                  }}
                  className={fieldClass}
                />
              </label>
              <label className="mt-2 block text-[11px] font-bold text-stone-700">
                Answer starter
                <input
                  value={field.starter}
                  onChange={(event) => {
                    const fields = part.plan.fields.map((entry) =>
                      entry.id === field.id ? { ...entry, starter: event.target.value } : entry,
                    );
                    onChange({ ...part, plan: { ...part.plan, fields } });
                  }}
                  className={fieldClass}
                />
              </label>
            </div>
          ))}
        </div>
      </StepEditor>

      <StepEditor
        number={3}
        title="Show your plan"
        question={part.story.question}
        direction={part.story.direction}
        onQuestion={(question) => onChange({ ...part, story: { ...part.story, question } })}
        onDirection={(direction) => onChange({ ...part, story: { ...part.story, direction } })}
      >
        <div className="grid gap-2 sm:grid-cols-3">
          {part.story.frames.map((frame) => (
            <label key={frame.id} className="block text-[11px] font-bold text-stone-700">
              Part label
              <input
                value={frame.label}
                onChange={(event) => {
                  const frames = part.story.frames.map((entry) =>
                    entry.id === frame.id ? { ...entry, label: event.target.value } : entry,
                  );
                  onChange({ ...part, story: { ...part.story, frames } });
                }}
                className={fieldClass}
              />
            </label>
          ))}
        </div>
      </StepEditor>

      <StepEditor
        number={4}
        title="Start your VLOG"
        question={part.opening.question}
        direction={part.opening.direction}
        onQuestion={(question) => onChange({ ...part, opening: { ...part.opening, question } })}
        onDirection={(direction) => onChange({ ...part, opening: { ...part.opening, direction } })}
      >
        <SentenceStarters
          values={part.opening.starters}
          onChange={(starters) => onChange({ ...part, opening: { ...part.opening, starters } })}
        />
      </StepEditor>

      <label className="block text-xs font-bold text-stone-800">
        Total points for teacher review
        <input
          type="number"
          min={1}
          max={100}
          value={part.maxPoints}
          onChange={(event) =>
            onChange({
              ...part,
              maxPoints: Math.max(1, Math.min(100, Number(event.target.value) || 1)),
            })
          }
          className={`${fieldClass} max-w-32`}
        />
      </label>
    </div>
  );
}

function StepEditor({
  number,
  title,
  question,
  direction,
  onQuestion,
  onDirection,
  children,
}: {
  number: number;
  title: string;
  question: string;
  direction: string;
  onQuestion: (value: string) => void;
  onDirection: (value: string) => void;
  children?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-[10px] font-extrabold uppercase tracking-wide text-teal-700">
        Step {number}
      </p>
      <h3 className="mt-1 text-sm font-extrabold text-stone-950">{title}</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-[11px] font-bold text-stone-700">
          Student question
          <input value={question} onChange={(event) => onQuestion(event.target.value)} className={fieldClass} />
        </label>
        <label className="block text-[11px] font-bold text-stone-700">
          Short direction
          <input value={direction} onChange={(event) => onDirection(event.target.value)} className={fieldClass} />
        </label>
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </section>
  );
}

function SentenceStarters({
  values,
  onChange,
}: {
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {values.map((value, index) => (
        <label key={index} className="block text-[11px] font-bold text-stone-700">
          Help phrase {index + 1}
          <input
            value={value}
            onChange={(event) =>
              onChange(values.map((entry, entryIndex) =>
                entryIndex === index ? event.target.value : entry,
              ))
            }
            className={fieldClass}
          />
        </label>
      ))}
    </div>
  );
}
