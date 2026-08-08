"use client";

import { useParentI18n } from "@/components/parent/ParentI18nProvider";
import { ParentNotificationsList } from "@/components/parent/ParentNotificationsList";
import type { ParentNotification } from "@/lib/parent/parent-notifications";

export function ParentNotificationsPageView(props: {
  notifications: ParentNotification[];
}) {
  const { t } = useParentI18n();
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-indigo-600">
          {t("alerts.eyebrow")}
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">{t("alerts.title")}</h1>
        <p className="mt-2 max-w-2xl leading-relaxed text-slate-600">{t("alerts.subtitle")}</p>
      </header>
      <ParentNotificationsList notifications={props.notifications} />
    </div>
  );
}
