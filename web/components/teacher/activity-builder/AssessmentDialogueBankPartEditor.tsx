"use client";

import {
  AuthoringItemPager,
  useAuthoringItemIndex,
} from "@/components/teacher/activity-builder/AuthoringItemPager";
import type { AssessmentPart } from "@/lib/assessment/types";

type DialogueBankPart = Extract<AssessmentPart, { kind: "dialogue_bank" }>;

type Props = {
  part: DialogueBankPart;
  onChange: (next: DialogueBankPart) => void;
};

function emptyExchange(
  responses: DialogueBankPart["activity"]["responses"],
): DialogueBankPart["activity"]["exchanges"][number] {
  return {
    id: `ex-${crypto.randomUUID().slice(0, 8)}`,
    speaker: "Speaker",
    prompt: "New prompt",
    correctResponseId: responses[0]?.id ?? "",
  };
}

function emptyResponse(): DialogueBankPart["activity"]["responses"][number] {
  return {
    id: `resp-${crypto.randomUUID().slice(0, 8)}`,
    text: "New response",
  };
}

export function AssessmentDialogueBankPartEditor({ part, onChange }: Props) {
  const { opening, exchanges, responses } = part.activity;
  const [itemIndex, setItemIndex] = useAuthoringItemIndex(exchanges.length, part.id);
  const exchange = exchanges[itemIndex];

  const patchActivity = (
    updater: (
      activity: DialogueBankPart["activity"],
    ) => DialogueBankPart["activity"],
  ) => onChange({ ...part, activity: updater(part.activity) });

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
        Dialogue bank
      </p>

      <label className="block text-[11px] font-bold text-stone-700">
        Opening
        <textarea
          value={opening}
          onChange={(event) =>
            patchActivity((activity) => ({
              ...activity,
              opening: event.target.value,
            }))
          }
          rows={2}
          className="mt-1 w-full resize-y rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold leading-5"
        />
      </label>

      <div className="space-y-2 rounded-lg border border-stone-200 bg-stone-50 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold text-stone-700">Response bank</p>
          <button
            type="button"
            onClick={() =>
              patchActivity((activity) => ({
                ...activity,
                responses: [...activity.responses, emptyResponse()],
              }))
            }
            className="rounded-md border border-stone-300 bg-white px-2 py-1 text-[10px] font-bold text-stone-700 hover:bg-stone-100"
          >
            Add
          </button>
        </div>
        <ul className="space-y-2">
          {responses.map((response, index) => (
            <li key={response.id} className="flex items-start gap-1.5">
              <span className="mt-2 shrink-0 text-[10px] font-black text-stone-500">
                {String.fromCharCode(65 + index)}.
              </span>
              <textarea
                value={response.text}
                onChange={(event) => {
                  const text = event.target.value;
                  patchActivity((activity) => ({
                    ...activity,
                    responses: activity.responses.map((row) =>
                      row.id === response.id ? { ...row, text } : row,
                    ),
                  }));
                }}
                rows={1}
                className="min-w-0 flex-1 resize-y rounded-md border border-stone-300 px-2 py-1 text-xs font-semibold leading-5"
                aria-label={`Response ${index + 1}`}
              />
              <button
                type="button"
                disabled={responses.length <= 2}
                onClick={() =>
                  patchActivity((activity) => ({
                    ...activity,
                    responses: activity.responses.filter(
                      (row) => row.id !== response.id,
                    ),
                    exchanges: activity.exchanges.map((row) =>
                      row.correctResponseId === response.id
                        ? {
                            ...row,
                            correctResponseId:
                              activity.responses.find((item) => item.id !== response.id)
                                ?.id ?? "",
                          }
                        : row,
                    ),
                  }))
                }
                className="shrink-0 rounded-md border border-red-200 px-2 py-1 text-[10px] font-bold text-red-700 hover:bg-red-50 disabled:opacity-35"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>

      <AuthoringItemPager
        count={exchanges.length}
        index={itemIndex}
        onIndexChange={setItemIndex}
        label="Exchange"
        itemLabels={exchanges.map(
          (row) => row.speaker.trim() || row.prompt.trim() || "Exchange",
        )}
        minCount={1}
        maxCount={12}
        onAdd={() => {
          patchActivity((activity) => ({
            ...activity,
            exchanges: [...activity.exchanges, emptyExchange(activity.responses)],
          }));
          setItemIndex(exchanges.length);
        }}
        onRemove={() => {
          if (exchanges.length <= 1 || !exchange) return;
          patchActivity((activity) => ({
            ...activity,
            exchanges: activity.exchanges.filter((row) => row.id !== exchange.id),
          }));
          setItemIndex(Math.max(0, itemIndex - 1));
        }}
      >
        {exchange ? (
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-stone-700">
              Speaker
              <input
                value={exchange.speaker}
                onChange={(event) => {
                  const speaker = event.target.value;
                  patchActivity((activity) => ({
                    ...activity,
                    exchanges: activity.exchanges.map((row) =>
                      row.id === exchange.id ? { ...row, speaker } : row,
                    ),
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
              />
            </label>
            <label className="block text-[11px] font-bold text-stone-700">
              Prompt
              <textarea
                value={exchange.prompt}
                onChange={(event) => {
                  const prompt = event.target.value;
                  patchActivity((activity) => ({
                    ...activity,
                    exchanges: activity.exchanges.map((row) =>
                      row.id === exchange.id ? { ...row, prompt } : row,
                    ),
                  }));
                }}
                rows={2}
                className="mt-1 w-full resize-y rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold leading-5"
              />
            </label>
            <label className="block text-[11px] font-bold text-stone-700">
              Correct response
              <select
                value={exchange.correctResponseId}
                onChange={(event) => {
                  const correctResponseId = event.target.value;
                  patchActivity((activity) => ({
                    ...activity,
                    exchanges: activity.exchanges.map((row) =>
                      row.id === exchange.id
                        ? { ...row, correctResponseId }
                        : row,
                    ),
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
              >
                <option value="">Choose…</option>
                {responses.map((response, index) => (
                  <option key={response.id} value={response.id}>
                    {String.fromCharCode(65 + index)}. {response.text.slice(0, 48)}
                    {response.text.length > 48 ? "…" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </AuthoringItemPager>
    </div>
  );
}
