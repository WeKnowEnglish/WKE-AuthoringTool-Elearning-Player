import Link from "next/link";
import {
  Award,
  BookOpenCheck,
  ExternalLink,
  Link2,
  Megaphone,
  Sparkles,
} from "lucide-react";
import type { ParentStreamItem, ParentStreamItemType } from "@/lib/parent/parent-stream";

const itemPresentation: Record<
  ParentStreamItemType,
  { label: string; icon: typeof Megaphone; color: string }
> = {
  teacher_update: { label: "Teacher update", icon: Megaphone, color: "bg-sky-100 text-sky-700" },
  teacher_link: { label: "Shared resource", icon: Link2, color: "bg-cyan-100 text-cyan-700" },
  homework_update: { label: "Homework update", icon: BookOpenCheck, color: "bg-amber-100 text-amber-800" },
  learning_activity: { label: "Learning activity", icon: Sparkles, color: "bg-violet-100 text-violet-700" },
  student_highlight: { label: "Learning highlight", icon: Sparkles, color: "bg-emerald-100 text-emerald-700" },
  milestone: { label: "Milestone", icon: Award, color: "bg-fuchsia-100 text-fuchsia-700" },
  progress_report: { label: "Progress report", icon: BookOpenCheck, color: "bg-indigo-100 text-indigo-700" },
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Recent";
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  }).format(date);
}

export function ParentStreamFeed(props: {
  studentName: string;
  items: ParentStreamItem[];
}) {
  if (props.items.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-indigo-500" aria-hidden />
        <h2 className="mt-4 text-xl font-black">Updates will appear here</h2>
        <p className="mx-auto mt-2 max-w-md leading-relaxed text-slate-600">
          {props.studentName}&apos;s teacher has not shared a parent update yet. Only information
          deliberately chosen for families will appear in this stream.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {props.items.map((item) => {
        const presentation = itemPresentation[item.type];
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
                  <span>{presentation.label}</span>
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
                    Open shared resource
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
