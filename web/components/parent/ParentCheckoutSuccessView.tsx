"use client";

import Link from "next/link";
import { CheckCircle2, Clock3 } from "lucide-react";
import { useParentI18n } from "@/components/parent/ParentI18nProvider";

export function ParentCheckoutSuccessView(props: {
  paid: boolean;
  pending: boolean;
  error: string | null;
}) {
  const { t } = useParentI18n();
  const title = props.paid
    ? t("checkout.successTitle")
    : props.pending
      ? t("checkout.successPending")
      : t("checkout.missingSession");
  const body = props.paid
    ? t("checkout.successBody")
    : props.pending
      ? t("checkout.successPendingBody")
      : props.error && props.error !== "missing"
        ? props.error
        : t("checkout.missingSession");

  return (
    <div className="mx-auto max-w-xl">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {props.paid ? (
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" aria-hidden />
        ) : (
          <Clock3 className="mx-auto h-10 w-10 text-indigo-600" aria-hidden />
        )}
        <p className="mt-4 text-sm font-extrabold uppercase tracking-[0.12em] text-indigo-600">
          {t("checkout.successEyebrow")}
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight">{title}</h1>
        <p className="mt-3 leading-relaxed text-slate-600">{body}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/parent"
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-indigo-700"
          >
            {t("checkout.backToPortal")}
          </Link>
          <Link
            href="/parent/checkout"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
          >
            {t("checkout.buyAgain")}
          </Link>
        </div>
      </div>
    </div>
  );
}
