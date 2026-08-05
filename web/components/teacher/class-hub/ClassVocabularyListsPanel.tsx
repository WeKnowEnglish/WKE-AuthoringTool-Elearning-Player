import Link from "next/link";

export type ClassVocabularyListSummary = {
  id: string;
  title: string;
  entryCount: number | null;
  href: string;
};

type Props = {
  archived: boolean;
  lists: ClassVocabularyListSummary[];
};

export function ClassVocabularyListsPanel({ archived, lists }: Props) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-neutral-900">Vocabulary lists</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Curriculum word lists from Activity Builder. Open a list to edit words, media, and
            compile quizzes for lessons.
          </p>
        </div>
        {!archived ? (
          <Link
            href="/teacher/activity-builder/vocabulary-lists"
            className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            + New / manage lists
          </Link>
        ) : null}
      </div>

      {lists.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-500">
          No vocabulary lists yet.{" "}
          <Link
            href="/teacher/activity-builder/vocabulary-lists"
            className="font-medium text-blue-700 underline"
          >
            Create one in Activity Builder
          </Link>
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-neutral-100 rounded border border-neutral-100">
          {lists.map((list) => (
            <li key={list.id}>
              <Link
                href={list.href}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 hover:bg-neutral-50"
              >
                <span className="font-medium text-neutral-900">{list.title}</span>
                <span className="text-xs text-neutral-500">
                  {list.entryCount == null
                    ? "Open →"
                    : `${list.entryCount} word${list.entryCount === 1 ? "" : "s"}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
