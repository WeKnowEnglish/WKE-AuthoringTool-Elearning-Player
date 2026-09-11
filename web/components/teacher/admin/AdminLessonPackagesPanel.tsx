"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  adminCreateLessonPackage,
  adminUpdateLessonPackage,
} from "@/lib/actions/admin-lesson-packages";
import { BILLING_CURRENCIES, LESSONS_PER_PACK, stripeAmountToMajor } from "@/lib/billing/money";
import type { LessonPackage } from "@/lib/billing/types";

const LESSON_OPTIONS = [8, 16, 24, 32, 40, 48];

type Draft = {
  name: string;
  description: string;
  lessonCount: number;
  priceMajor: string;
  currency: string;
  isActive: boolean;
  sortOrder: number;
};

function draftFromPackage(pack: LessonPackage): Draft {
  return {
    name: pack.name,
    description: pack.description,
    lessonCount: pack.lessonCount,
    priceMajor: String(stripeAmountToMajor(pack.unitAmount, pack.currency)),
    currency: pack.currency,
    isActive: pack.isActive,
    sortOrder: pack.sortOrder,
  };
}

const emptyDraft: Draft = {
  name: "8-lesson pack",
  description: "",
  lessonCount: LESSONS_PER_PACK,
  priceMajor: "",
  currency: "vnd",
  isActive: true,
  sortOrder: 0,
};

function PackageFields(props: {
  draft: Draft;
  disabled: boolean;
  onChange: (next: Draft) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm font-semibold text-neutral-700 sm:col-span-2">
        Name
        <input
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          value={props.draft.name}
          disabled={props.disabled}
          onChange={(event) => props.onChange({ ...props.draft, name: event.target.value })}
        />
      </label>
      <label className="block text-sm font-semibold text-neutral-700 sm:col-span-2">
        Description
        <textarea
          className="mt-1 min-h-20 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          value={props.draft.description}
          disabled={props.disabled}
          onChange={(event) =>
            props.onChange({ ...props.draft, description: event.target.value })
          }
        />
      </label>
      <label className="block text-sm font-semibold text-neutral-700">
        Lessons
        <select
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          value={props.draft.lessonCount}
          disabled={props.disabled}
          onChange={(event) =>
            props.onChange({ ...props.draft, lessonCount: Number(event.target.value) })
          }
        >
          {LESSON_OPTIONS.map((count) => (
            <option key={count} value={count}>
              {count} lessons
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-semibold text-neutral-700">
        Currency
        <select
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          value={props.draft.currency}
          disabled={props.disabled}
          onChange={(event) => props.onChange({ ...props.draft, currency: event.target.value })}
        >
          {BILLING_CURRENCIES.map((currency) => (
            <option key={currency} value={currency}>
              {currency.toUpperCase()}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-semibold text-neutral-700">
        Price ({props.draft.currency.toUpperCase()})
        <input
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          inputMode="decimal"
          value={props.draft.priceMajor}
          disabled={props.disabled}
          onChange={(event) => props.onChange({ ...props.draft, priceMajor: event.target.value })}
        />
      </label>
      <label className="block text-sm font-semibold text-neutral-700">
        Sort order
        <input
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          type="number"
          value={props.draft.sortOrder}
          disabled={props.disabled}
          onChange={(event) =>
            props.onChange({ ...props.draft, sortOrder: Number(event.target.value) })
          }
        />
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700 sm:col-span-2">
        <input
          type="checkbox"
          checked={props.draft.isActive}
          disabled={props.disabled}
          onChange={(event) => props.onChange({ ...props.draft, isActive: event.target.checked })}
        />
        Visible on parent checkout
      </label>
    </div>
  );
}

export function AdminLessonPackagesPanel(props: { packages: LessonPackage[] }) {
  const router = useRouter();
  const [createDraft, setCreateDraft] = useState<Draft>(emptyDraft);
  const [edits, setEdits] = useState<Record<string, Draft>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const draftFor = (pack: LessonPackage): Draft => edits[pack.id] ?? draftFromPackage(pack);

  return (
    <div className="space-y-6">
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold">New package</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Parents buy packs of 8 lessons, or multiples of 8. Price is what Stripe charges on the
          next checkout.
        </p>
        <form
          className="mt-4 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            setMessage(null);
            startTransition(async () => {
              const result = await adminCreateLessonPackage(createDraft);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setMessage(result.message);
              setCreateDraft(emptyDraft);
              router.refresh();
            });
          }}
        >
          <PackageFields draft={createDraft} disabled={pending} onChange={setCreateDraft} />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Create package
          </button>
        </form>
      </section>

      {props.packages.map((pack) => (
        <section key={pack.id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">{pack.name}</h2>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {pack.isActive ? "Active" : "Hidden"}
            </p>
          </div>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);
              setMessage(null);
              const draft = draftFor(pack);
              startTransition(async () => {
                const result = await adminUpdateLessonPackage({ id: pack.id, ...draft });
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setMessage(result.message);
                router.refresh();
              });
            }}
          >
            <PackageFields
              draft={draftFor(pack)}
              disabled={pending}
              onChange={(next) => setEdits((current) => ({ ...current, [pack.id]: next }))}
            />
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-800 disabled:opacity-50"
            >
              Save package
            </button>
          </form>
        </section>
      ))}
    </div>
  );
}
