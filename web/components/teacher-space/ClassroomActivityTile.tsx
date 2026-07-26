import Link from "next/link";
import {
  ClassroomFormatIcon,
  classroomFormatLabel,
} from "@/components/teacher-space/ClassroomFormatIcon";
import type { TeacherSpaceItemSummary } from "@/lib/teacher-space/types";

type Props = {
  item: TeacherSpaceItemSummary;
};

export function ClassroomActivityTile({ item }: Props) {
  return (
    <Link
      href={item.playPath}
      className="group flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-[var(--classroom-panel)] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div
        className="relative aspect-[4/3] overflow-hidden"
        style={{ background: "var(--classroom-tile)" }}
      >
        {item.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.cover_image_url}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[var(--classroom-accent)]">
            <ClassroomFormatIcon format={item.format} className="h-16 w-16" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 px-3 py-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 text-[var(--classroom-accent)]">
            <ClassroomFormatIcon format={item.format} className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="font-bold leading-snug text-[var(--classroom-ink)]">{item.title}</p>
            <p className="mt-0.5 text-xs font-semibold text-[var(--classroom-muted)]">
              {classroomFormatLabel(item.format)}
              {item.caption ? ` · ${item.caption}` : ""}
            </p>
          </div>
        </div>
        <span className="mt-2 text-sm font-bold text-[var(--classroom-accent)]">Play →</span>
      </div>
    </Link>
  );
}
