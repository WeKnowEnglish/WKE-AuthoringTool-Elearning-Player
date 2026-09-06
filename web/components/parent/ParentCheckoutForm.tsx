"use client";

import { useMemo, useState, useTransition } from "react";
import { startParentLessonCheckout } from "@/lib/actions/parent-checkout";
import { formatStripeMoney, LESSONS_PER_PACK } from "@/lib/billing/money";
import type { LessonPackage } from "@/lib/billing/types";
import { useParentI18n } from "@/components/parent/ParentI18nProvider";
import type { ParentLinkedStudent } from "@/lib/parent/guardian-data";

const QUANTITIES = [1, 2, 3, 4, 5, 6] as const;

export function ParentCheckoutForm(props: {
  students: ParentLinkedStudent[];
  packages: LessonPackage[];
  creditsByStudentId: Record<string, number>;
  initialStudentId: string | null;
  stripeReady: boolean;
  canceled: boolean;
}) {
  const { t, locale } = useParentI18n();
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";
  const [studentId, setStudentId] = useState(
    props.initialStudentId && props.students.some((s) => s.studentId === props.initialStudentId)
      ? props.initialStudentId
      : (props.students[0]?.studentId ?? ""),
  );
  const [packageId, setPackageId] = useState(props.packages[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedPack = useMemo(
    () => props.packages.find((item) => item.id === packageId) ?? props.packages[0] ?? null,
    [packageId, props.packages],
  );
  const selectedStudent = props.students.find((item) => item.studentId === studentId) ?? null;
  const remaining = selectedStudent
    ? (props.creditsByStudentId[selectedStudent.studentId] ?? 0)
    : 0;
  const totalLessons = selectedPack ? selectedPack.lessonCount * quantity : 0;
  const totalAmount = selectedPack ? selectedPack.unitAmount * quantity : 0;

  const pay = () => {
    setError(null);
    if (!selectedStudent || !selectedPack) {
      setError(t("checkout.errorGeneric"));
      return;
    }
    startTransition(async () => {
      const result = await startParentLessonCheckout({
        packageId: selectedPack.id,
        studentId: selectedStudent.studentId,
        quantity,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.assign(result.url);
    });
  };

  if (props.students.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <h2 className="text-lg font-black">{t("checkout.noChildTitle")}</h2>
        <p className="mt-2 text-slate-600">{t("checkout.noChildBody")}</p>
      </div>
    );
  }

  if (props.packages.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-slate-600">{t("checkout.noPackages")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {props.canceled ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">
          {t("checkout.canceled")}
        </p>
      ) : null}
      {!props.stripeReady ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
          {t("checkout.notConfigured")}
        </p>
      ) : null}

      <fieldset className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <legend className="px-1 text-sm font-extrabold uppercase tracking-[0.12em] text-indigo-600">
          {t("checkout.child")}
        </legend>
        <div className="mt-3 grid gap-2">
          {props.students.map((student) => {
            const selected = student.studentId === studentId;
            const credit = props.creditsByStudentId[student.studentId] ?? 0;
            return (
              <label
                key={student.studentId}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 ${
                  selected
                    ? "border-indigo-600 bg-indigo-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="checkout-student"
                  className="mt-1"
                  checked={selected}
                  onChange={() => setStudentId(student.studentId)}
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold">{student.displayName}</span>
                  {student.classTitle ? (
                    <span className="block text-sm text-slate-500">{student.classTitle}</span>
                  ) : null}
                  <span className="mt-1 block text-xs font-bold text-slate-500">
                    {t("checkout.remainingCount", { count: credit })}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <legend className="px-1 text-sm font-extrabold uppercase tracking-[0.12em] text-indigo-600">
          {t("checkout.pack")}
        </legend>
        <div className="mt-3 grid gap-2">
          {props.packages.map((pack) => {
            const selected = pack.id === selectedPack?.id;
            return (
              <label
                key={pack.id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 ${
                  selected
                    ? "border-indigo-600 bg-indigo-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="checkout-pack"
                  className="mt-1"
                  checked={selected}
                  onChange={() => setPackageId(pack.id)}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-extrabold">{pack.name}</span>
                    <span className="text-sm font-black">
                      {formatStripeMoney(pack.unitAmount, pack.currency, dateLocale)}
                    </span>
                  </span>
                  <span className="mt-1 block text-sm text-slate-600">
                    {t("checkout.lessonsCount", { count: pack.lessonCount })}
                  </span>
                  {pack.description ? (
                    <span className="mt-1 block text-sm text-slate-500">{pack.description}</span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <legend className="px-1 text-sm font-extrabold uppercase tracking-[0.12em] text-indigo-600">
          {t("checkout.quantity")}
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUANTITIES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setQuantity(value)}
              className={`min-h-11 rounded-xl px-3 py-2 text-sm font-extrabold ${
                quantity === value
                  ? "bg-indigo-600 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {t("checkout.quantityPacks", {
                count: value,
                lessons: value * (selectedPack?.lessonCount ?? LESSONS_PER_PACK),
              })}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/80 p-5">
        <p className="text-sm font-extrabold text-indigo-950">
          {t("checkout.total")}{" "}
          {selectedPack
            ? formatStripeMoney(totalAmount, selectedPack.currency, dateLocale)
            : "—"}
        </p>
        <p className="mt-1 text-sm text-indigo-900">
          {t("checkout.lessonsCount", { count: totalLessons })}
          {selectedStudent ? ` · ${selectedStudent.displayName}` : null}
        </p>
        {remaining > 0 ? (
          <p className="mt-2 text-xs font-bold text-indigo-800">
            {t("checkout.remainingCount", { count: remaining })}
          </p>
        ) : null}
        {error ? (
          <p className="mt-3 text-sm font-semibold text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={pay}
          disabled={isPending || !props.stripeReady}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-indigo-700 disabled:opacity-50 sm:w-auto"
        >
          {isPending ? t("checkout.paying") : t("checkout.pay")}
        </button>
        <p className="mt-2 text-xs text-indigo-800">{t("checkout.secure")}</p>
      </div>
    </div>
  );
}
