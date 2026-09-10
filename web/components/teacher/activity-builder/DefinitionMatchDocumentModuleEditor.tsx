"use client";

import type { HomeworkCollectionDocumentModulePart } from "@/lib/homework-collections";
import { documentModuleValidationIssues } from "@/lib/homework-collections/document-module";
import { createBlankDefinitionMatchPair } from "@/lib/definition-match/blank";
import {
  asDefinitionMatchDraft,
  cloneDefinitionMatchDocumentForAuthoring,
} from "@/lib/definition-match/draft";
import { createSampleDefinitionMatchDocument } from "@/lib/definition-match/sample";
import {
  DEFINITION_MATCH_MAX_PAIRS,
  DEFINITION_MATCH_MIN_PAIRS,
  type DefinitionMatchDocument,
  type DefinitionMatchPair,
} from "@/lib/definition-match/types";
import {
  AuthoringItemPager,
  useAuthoringItemIndex,
} from "@/components/teacher/activity-builder/AuthoringItemPager";

type Props = {
  part: HomeworkCollectionDocumentModulePart;
  onChange: (part: HomeworkCollectionDocumentModulePart) => void;
  /** Activity Bank workspace owns title/instructions here; Track Builder setup already has them. */
  showIdentityFields?: boolean;
};

const fieldClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs font-semibold";

function duplicatePair(pair: DefinitionMatchPair): DefinitionMatchPair {
  return {
    ...pair,
    id: crypto.randomUUID(),
  };
}

export function DefinitionMatchDocumentModuleEditor({
  part,
  onChange,
  showIdentityFields = false,
}: Props) {
  const document = asDefinitionMatchDraft(part.document);
  const issues = documentModuleValidationIssues(part);
  const [pairIndex, setPairIndex] = useAuthoringItemIndex(
    document.pairs.length,
    `${part.id}-pairs`,
  );
  const pair = document.pairs[pairIndex];

  const commit = (
    next: DefinitionMatchDocument,
    identity?: { title?: string; instructions?: string },
  ) => {
    const title = identity?.title ?? part.title;
    const instructions = identity?.instructions ?? part.instructions;
    onChange({
      ...part,
      title,
      instructions,
      document: {
        ...next,
        title,
        instructions,
      } as unknown as Record<string, unknown>,
    });
  };

  const patchPair = (pairId: string, patch: Partial<DefinitionMatchPair>) => {
    commit({
      ...document,
      pairs: document.pairs.map((item) =>
        item.id === pairId ? { ...item, ...patch } : item,
      ),
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
            Definition match content
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-stone-500">
            Write {DEFINITION_MATCH_MIN_PAIRS}–{DEFINITION_MATCH_MAX_PAIRS} unique
            words and meanings. Do not put the word inside its definition.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const sample = cloneDefinitionMatchDocumentForAuthoring(
              createSampleDefinitionMatchDocument(),
            );
            onChange({
              ...part,
              title: sample.title,
              instructions: sample.instructions,
              document: sample as unknown as Record<string, unknown>,
            });
          }}
          className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-stone-800 hover:bg-stone-50"
        >
          Load sample
        </button>
      </div>

      {showIdentityFields ? (
        <>
          <label className="block text-[11px] font-bold text-stone-700">
            Title
            <input
              value={part.title}
              onChange={(event) =>
                commit(document, { title: event.target.value })
              }
              className={fieldClass}
            />
          </label>
          <label className="block text-[11px] font-bold text-stone-700">
            Student instructions
            <textarea
              value={part.instructions}
              rows={2}
              onChange={(event) =>
                commit(document, { instructions: event.target.value })
              }
              className={fieldClass}
            />
          </label>
        </>
      ) : null}

      <label className="flex items-center gap-2 text-[11px] font-bold text-stone-700">
        <input
          type="checkbox"
          checked={document.shuffleWords}
          onChange={(event) =>
            commit({ ...document, shuffleWords: event.target.checked })
          }
        />
        Shuffle the word bank for students
      </label>

      <AuthoringItemPager
        count={document.pairs.length}
        index={pairIndex}
        onIndexChange={setPairIndex}
        label="Pair"
        itemLabels={document.pairs.map((item) => item.word)}
        minCount={DEFINITION_MATCH_MIN_PAIRS}
        maxCount={DEFINITION_MATCH_MAX_PAIRS}
        stickyNav
        onAdd={() => {
          commit({
            ...document,
            pairs: [...document.pairs, createBlankDefinitionMatchPair()],
          });
          setPairIndex(document.pairs.length);
        }}
        onDuplicate={() => {
          if (!pair) return;
          const pairs = [...document.pairs];
          pairs.splice(pairIndex + 1, 0, duplicatePair(pair));
          commit({ ...document, pairs });
          setPairIndex(pairIndex + 1);
        }}
        onRemove={() => {
          if (!pair || document.pairs.length <= DEFINITION_MATCH_MIN_PAIRS) {
            return;
          }
          commit({
            ...document,
            pairs: document.pairs.filter((item) => item.id !== pair.id),
          });
        }}
      >
        {pair ? (
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-stone-700">
              Word
              <input
                value={pair.word}
                onChange={(event) => patchPair(pair.id, { word: event.target.value })}
                placeholder="e.g. garden"
                className={fieldClass}
              />
            </label>
            <label className="block text-[11px] font-bold text-stone-700">
              Definition
              <textarea
                value={pair.definition}
                rows={3}
                onChange={(event) =>
                  patchPair(pair.id, { definition: event.target.value })
                }
                placeholder="e.g. An outdoor place where people grow flowers or vegetables."
                className={fieldClass}
              />
            </label>
          </div>
        ) : null}
      </AuthoringItemPager>

      {issues.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-950">
          Fix before assign:
          <ul className="mt-1 list-disc pl-4">
            {issues.slice(0, 6).map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-[11px] font-semibold text-emerald-700">
          Definition match looks valid for assign.
        </p>
      )}
    </div>
  );
}
