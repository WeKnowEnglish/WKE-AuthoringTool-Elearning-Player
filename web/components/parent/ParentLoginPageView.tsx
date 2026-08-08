"use client";

import { ParentAuthForm } from "@/components/parent/ParentAuthForm";
import { useParentI18n } from "@/components/parent/ParentI18nProvider";
import { ParentLanguageToggle } from "@/components/parent/ParentLanguageToggle";

export function ParentLoginPageView(props: { nextPath: string }) {
  const { t, locale } = useParentI18n();
  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-10 text-slate-950" lang={locale}>
      <div className="mx-auto max-w-md">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-600">
              {t("brand.tagline")}
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight">{t("login.title")}</h1>
          </div>
          <ParentLanguageToggle />
        </div>
        <p className="mt-3 leading-relaxed text-slate-600">{t("login.subtitle")}</p>
        <div className="mt-7">
          <ParentAuthForm nextPath={props.nextPath} />
        </div>
      </div>
    </main>
  );
}
