"use client";

import { useParentI18n } from "@/components/parent/ParentI18nProvider";
import { ParentSettingsForm } from "@/components/parent/ParentSettingsForm";
import type { ParentAccountSettings } from "@/lib/parent/parent-notifications";

export function ParentSettingsPageView(props: { initial: ParentAccountSettings }) {
  const { t } = useParentI18n();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-indigo-600">
          {t("settings.eyebrow")}
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">{t("settings.title")}</h1>
        <p className="mt-2 leading-relaxed text-slate-600">{t("settings.subtitle")}</p>
      </header>
      <ParentSettingsForm initial={props.initial} />
    </div>
  );
}
