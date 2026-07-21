import Link from "next/link";
import { createTeacherWordPackFromForm } from "@/lib/actions/teacher-word-packs";
import type { TeacherWordPackSummary } from "@/lib/data/teacher-word-packs";

type Props = {
  classId: string;
  archived: boolean;
  packs: TeacherWordPackSummary[];
};

export function ClassWordPacksPanel({ classId, archived, packs }: Props) {
  return (
    <section className="rounded border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-neutral-900">Word packs</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Vocabulary packs linked to this class. Open a pack to edit the sheet.
          </p>
        </div>
        {!archived ? (
          <form action={createTeacherWordPackFromForm} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="class_id" value={classId} />
            <input
              name="title"
              placeholder="New pack for this class"
              className="rounded border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-900"
            />
            <button
              type="submit"
              className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              + New pack
            </button>
          </form>
        ) : null}
      </div>

      {packs.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-500">
          No packs linked yet.{" "}
          <Link href="/teacher/word-packs" className="font-medium text-blue-700 underline">
            Browse all word packs
          </Link>
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-neutral-100 rounded border border-neutral-100">
          {packs.map((pack) => (
            <li key={pack.id}>
              <Link
                href={`/teacher/word-packs/${pack.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 hover:bg-neutral-50"
              >
                <span className="font-medium text-neutral-900">{pack.title}</span>
                <span className="text-xs text-neutral-500">
                  {pack.wordCount} word{pack.wordCount === 1 ? "" : "s"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
