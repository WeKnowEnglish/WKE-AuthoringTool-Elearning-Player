"use client";

import Link from "next/link";
import { Mail, ShieldCheck, UserRound } from "lucide-react";
import { useParentI18n } from "@/components/parent/ParentI18nProvider";
import type { ParentLinkedStudent } from "@/lib/parent/guardian-data";

export function ParentManageChildrenView(props: { students: ParentLinkedStudent[] }) {
  const { t } = useParentI18n();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-indigo-600">
          {t("children.eyebrow")}
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">{t("children.title")}</h1>
        <p className="mt-2 max-w-2xl leading-relaxed text-slate-600">
          {t("children.subtitle")}
        </p>
      </header>

      {props.students.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {props.students.map((student) => (
            <article
              key={student.studentId}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700">
                  <UserRound className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-black">{student.displayName}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {student.classTitle ?? t("children.activeConnection")}
                  </p>
                </div>
                <ShieldCheck
                  className="h-5 w-5 text-emerald-600"
                  aria-label={t("children.activeAccess")}
                />
              </div>
              <Link
                href={`/parent/students/${student.studentId}/stream`}
                className="mt-5 inline-flex rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-indigo-700"
              >
                {t("children.viewUpdates")}
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Mail className="mx-auto h-8 w-8 text-slate-400" aria-hidden />
          <h2 className="mt-3 text-lg font-black">{t("children.emptyTitle")}</h2>
          <p className="mt-2 text-slate-600">{t("children.emptyBody")}</p>
        </div>
      )}

      <aside className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
        <p className="font-extrabold">{t("children.changeTitle")}</p>
        <p className="mt-1 leading-relaxed">{t("children.changeBody")}</p>
      </aside>
    </div>
  );
}
