import { useCallback, useState } from "react";

type AnswerUpdater =
  | Record<string, string>
  | ((prev: Record<string, string>) => Record<string, string>);

/** Controlled or local answer map for homework collection embeds. */
export function useSyncedAnswerMap(
  external?: Record<string, string>,
  onExternalChange?: (next: Record<string, string>) => void,
): [Record<string, string>, (next: AnswerUpdater) => void] {
  const [local, setLocal] = useState<Record<string, string>>(external ?? {});
  const answers = external ?? local;
  const setAnswers = useCallback(
    (next: AnswerUpdater) => {
      const resolved =
        typeof next === "function" ? next(external ?? local) : next;
      onExternalChange?.(resolved);
      if (external === undefined) setLocal(resolved);
    },
    [external, local, onExternalChange],
  );
  return [answers, setAnswers];
}
