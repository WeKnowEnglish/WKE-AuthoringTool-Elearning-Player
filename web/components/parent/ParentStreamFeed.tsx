"use client";

import Link from "next/link";
import {
  Award,
  BookOpenCheck,
  ExternalLink,
  Link2,
  Megaphone,
  Sparkles,
} from "lucide-react";
import { useParentI18n } from "@/components/parent/ParentI18nProvider";
import { parentDateLocale, type ParentMessageKey } from "@/lib/parent/i18n";
import type { ParentStreamItem, ParentStreamItemType } from "@/lib/parent/parent-stream";

const itemIcons: Record<
  ParentStreamItemType,
  { icon: typeof Megaphone; color: string; labelKey: ParentMessageKey }
> = {
  teacher_update: {
    icon: Megaphone,
    color: "bg-sky-100 text-sky-700",
    labelKey: "stream.type.teacher_update",
  },
  teacher_link: {
    icon: Link2,
    color: "bg-cyan-100 text-cyan-700",
    labelKey: "stream.type.teacher_link",
  },
  homework_update: {
    icon: BookOpenCheck,
    color: "bg-amber-100 text-amber-800",
    labelKey: "stream.type.homework_update",
  },
  learning_activity: {
    icon: Sparkles,
    color: "bg-violet-100 text-violet-700",
    labelKey: "stream.type.learning_activity",
  },
  student_highlight: {
    icon: Sparkles,
    color: "bg-emerald-100 text-emerald-700",
    labelKey: "stream.type.student_highlight",
  },
  milestone: {
    icon: Award,
    color: "bg-fuchsia-100 text-fuchsia-700",
    labelKey: "stream.type.milestone",
  },
  progress_report: {
    icon: BookOpenCheck,
    color: "bg-indigo-100 text-indigo-700",
    labelKey: "stream.type.progress_report",
  },
};

export function ParentStreamFeed(props: {
  studentName: string | null;
  items: ParentStreamItem[];
}) {
  const { t, locale } = useParentI18n();
  const displayName = props.studentName?.trim() || t("home.yourChild");

  function formatDate(value: string): string {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return t("alerts.recent");
    return new Intl.DateTimeFormat(parentDateLocale(locale), {
      day: "numeric",
      month: "short",
      year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    }).format(date);
  }

  if (props.items.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-indigo-500" aria-hidden />
        <h2 className="mt-4 text-xl font-black">{t("stream.emptyTitle")}</h2>
        <p className="mx-auto mt-2 max-w-md leading-relaxed text-slate-600">
          {t("stream.emptyBody", { name: displayName })}
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {props.items.map((item) => {
        const presentation = itemIcons[item.type];
        const Icon = presentation.icon;
        return (
          <article
            key={`${item.type}:${item.sourceId}`}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <span className={`rounded-xl p-2.5 ${presentation.color}`}>
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold text-slate-500">
                  <span>{t(presentation.labelKey)}</span>
                  <span aria-hidden>·</span>
                  <time dateTime={item.occurredAt}>{formatDate(item.occurredAt)}</time>
                  {item.contextLabel ? (
                    <>
                      <span aria-hidden>·</span>
                      <span>{item.contextLabel}</span>
                    </>
                  ) : null}
                </div>
                <h2 className="mt-2 text-lg font-black tracking-tight text-slate-950">
                  {item.title}
                </h2>
                {item.body ? (
                  <p className="mt-2 whitespace-pre-wrap leading-relaxed text-slate-700">
                    {item.body}
                  </p>
                ) : null}
                {item.linkUrl ? (
                  <Link
                    href={item.linkUrl}
                    target={item.linkUrl.startsWith("/") ? undefined : "_blank"}
                    rel={item.linkUrl.startsWith("/") ? undefined : "noreferrer"}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-extrabold text-indigo-700 hover:bg-indigo-100"
                  >
                    {t("stream.openResource")}
                    <ExternalLink className="h-4 w-4" aria-hidden />
                  </Link>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
