"use client";

import { useParentI18n } from "@/components/parent/ParentI18nProvider";
import { ParentCheckoutForm } from "@/components/parent/ParentCheckoutForm";
import { formatStripeMoney } from "@/lib/billing/money";
import type { LessonPackage, LessonPackOrder } from "@/lib/billing/types";
import type { ParentLinkedStudent } from "@/lib/parent/guardian-data";

export function ParentCheckoutView(props: {
  students: ParentLinkedStudent[];
  packages: LessonPackage[];
  orders: LessonPackOrder[];
  creditsByStudentId: Record<string, number>;
  initialStudentId: string | null;
  stripeReady: boolean;
  canceled: boolean;
}) {
  const { t, locale } = useParentI18n();
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";
  const paidOrders = props.orders.filter((order) => order.status === "paid");
  const nameById = new Map(props.students.map((student) => [student.studentId, student.displayName]));

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-indigo-600">
          {t("checkout.eyebrow")}
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">{t("checkout.title")}</h1>
        <p className="mt-2 leading-relaxed text-slate-600">{t("checkout.subtitle")}</p>
      </header>

      <ParentCheckoutForm
        students={props.students}
        packages={props.packages}
        creditsByStudentId={props.creditsByStudentId}
        initialStudentId={props.initialStudentId}
        stripeReady={props.stripeReady}
        canceled={props.canceled}
      />

      {paidOrders.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">{t("checkout.recent")}</h2>
          <ul className="mt-3 space-y-3">
            {paidOrders.slice(0, 6).map((order) => (
              <li
                key={order.id}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <p className="font-extrabold">
                    {order.packageName ?? t("checkout.pack")} ·{" "}
                    {t("checkout.lessonsCount", { count: order.lessonCount })}
                  </p>
                  <p className="text-sm text-slate-500">
                    {nameById.get(order.studentId) ?? t("nav.child")}
                    {order.paidAt
                      ? ` · ${t("checkout.paidOn", {
                          date: new Date(order.paidAt).toLocaleDateString(dateLocale),
                        })}`
                      : null}
                  </p>
                </div>
                <p className="text-sm font-black">
                  {formatStripeMoney(
                    order.unitAmount * order.quantity,
                    order.currency,
                    dateLocale,
                  )}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
