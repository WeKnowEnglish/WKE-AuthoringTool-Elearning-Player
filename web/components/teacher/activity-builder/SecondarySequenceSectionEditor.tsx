"use client";

import {
  parseSecondarySequenceSection,
  secondarySequenceSectionValidationIssues,
  type SecondaryReadingSection,
} from "@/lib/homework-templates/secondary-homework-one";
import {
  AuthoringItemPager,
  useAuthoringItemIndex,
} from "@/components/teacher/activity-builder/AuthoringItemPager";

type Props = {
  section: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
};

export function SecondarySequenceSectionEditor({ section, onChange }: Props) {
  const parsed = parseSecondarySequenceSection(section);
  const issues = secondarySequenceSectionValidationIssues(section);
  const [paragraphIndex, setParagraphIndex] = useAuthoringItemIndex(
    parsed?.paragraphs.length ?? 0,
    parsed ? `${parsed.partId ?? "sequence"}:paragraphs` : undefined,
  );
  const [eventIndex, setEventIndex] = useAuthoringItemIndex(
    parsed?.events.length ?? 0,
    parsed ? `${parsed.partId ?? "sequence"}:events` : undefined,
  );

  if (!parsed) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
        This reading / sequence section is invalid and can’t be edited until Reset
        from template.
        {issues[0] ? (
          <p className="mt-1 font-medium opacity-80">{issues[0]}</p>
        ) : null}
      </div>
    );
  }

  const patch = (
    updater: (prev: SecondaryReadingSection) => SecondaryReadingSection,
  ) => {
    onChange(updater(parsed) as unknown as Record<string, unknown>);
  };

  const moveCorrectOrder = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= parsed.correctOrder.length) return;
    patch((prev) => {
      const next = [...prev.correctOrder];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return { ...prev, correctOrder: next };
    });
  };

  const paragraph = parsed.paragraphs[paragraphIndex];
  const event = parsed.events[eventIndex];

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
          Reading + sequence content
        </p>
        <p className="mt-0.5 text-[11px] font-semibold text-stone-500">
          Edit the article one paragraph at a time, events one at a time, then set
          the correct order below.
        </p>
      </div>

      <label className="block text-[11px] font-bold text-stone-700">
        Article title
        <input
          value={parsed.title}
          onChange={(eventChange) => {
            const title = eventChange.target.value;
            patch((prev) => ({ ...prev, title }));
          }}
          className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
        />
      </label>

      <AuthoringItemPager
        count={parsed.paragraphs.length}
        index={paragraphIndex}
        onIndexChange={setParagraphIndex}
        label="Paragraph"
        minCount={1}
        maxCount={12}
        onAdd={() => {
          patch((prev) => ({
            ...prev,
            paragraphs: [...prev.paragraphs, "New paragraph."],
          }));
          setParagraphIndex(parsed.paragraphs.length);
        }}
        onRemove={() => {
          patch((prev) => ({
            ...prev,
            paragraphs: prev.paragraphs.filter((_, i) => i !== paragraphIndex),
          }));
        }}
      >
        {typeof paragraph === "string" ? (
          <label className="block text-[11px] font-bold text-stone-700">
            Text
            <textarea
              value={paragraph}
              rows={3}
              onChange={(eventChange) => {
                const value = eventChange.target.value;
                patch((prev) => ({
                  ...prev,
                  paragraphs: prev.paragraphs.map((item, i) =>
                    i === paragraphIndex ? value : item,
                  ),
                }));
              }}
              className="mt-1 w-full resize-y rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold leading-5"
            />
          </label>
        ) : null}
      </AuthoringItemPager>

      <AuthoringItemPager
        count={parsed.events.length}
        index={eventIndex}
        onIndexChange={setEventIndex}
        label="Event"
        minCount={2}
        maxCount={12}
        onAdd={() => {
          const id = String.fromCharCode(65 + parsed.events.length);
          patch((prev) => ({
            ...prev,
            events: [...prev.events, { id, text: "New event." }],
            correctOrder: [...prev.correctOrder, id],
          }));
          setEventIndex(parsed.events.length);
        }}
        onRemove={() => {
          if (!event) return;
          patch((prev) => ({
            ...prev,
            events: prev.events.filter((item) => item.id !== event.id),
            correctOrder: prev.correctOrder.filter((id) => id !== event.id),
          }));
        }}
      >
        {event ? (
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-stone-700">
              Id
              <input
                value={event.id}
                onChange={(eventChange) => {
                  const nextId = eventChange.target.value.trim() || event.id;
                  patch((prev) => ({
                    ...prev,
                    events: prev.events.map((item, i) =>
                      i === eventIndex ? { ...item, id: nextId } : item,
                    ),
                    correctOrder: prev.correctOrder.map((id) =>
                      id === event.id ? nextId : id,
                    ),
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
              />
            </label>
            <label className="block text-[11px] font-bold text-stone-700">
              Text
              <textarea
                value={event.text}
                rows={2}
                onChange={(eventChange) => {
                  const text = eventChange.target.value;
                  patch((prev) => ({
                    ...prev,
                    events: prev.events.map((item, i) =>
                      i === eventIndex ? { ...item, text } : item,
                    ),
                  }));
                }}
                className="mt-1 w-full resize-y rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold leading-5"
              />
            </label>
          </div>
        ) : null}
      </AuthoringItemPager>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
          Correct order
        </p>
        <ol className="mt-2 space-y-1.5">
          {parsed.correctOrder.map((eventId, index) => {
            const orderEvent = parsed.events.find((item) => item.id === eventId);
            return (
              <li
                key={`${eventId}-${index}`}
                className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-2 py-1.5"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-900 text-[10px] font-black text-white">
                  {index + 1}
                </span>
                <p className="min-w-0 flex-1 text-[11px] font-semibold text-stone-700">
                  <span className="font-extrabold">{eventId}.</span>{" "}
                  {orderEvent?.text ?? "(missing event)"}
                </p>
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveCorrectOrder(index, -1)}
                  className="text-[11px] font-bold text-stone-700 disabled:opacity-30"
                >
                  Up
                </button>
                <button
                  type="button"
                  disabled={index === parsed.correctOrder.length - 1}
                  onClick={() => moveCorrectOrder(index, 1)}
                  className="text-[11px] font-bold text-stone-700 disabled:opacity-30"
                >
                  Down
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {issues.length > 0 ? (
        <p className="text-[11px] font-semibold text-amber-800">{issues[0]}</p>
      ) : null}
    </div>
  );
}
