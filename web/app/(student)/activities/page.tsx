import Link from "next/link";
import { ActivityLibraryPreview } from "@/components/teacher/activities/ActivityLibraryPreview";
import {
  type ActivitySubtype,
  searchActivityLibrary,
} from "@/lib/data/teacher";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

const subtypeOptions: Array<{ value: ActivitySubtype; label: string }> = [
  { value: "mc_quiz", label: "Multiple Choice" },
  { value: "true_false", label: "True / False" },
  { value: "fill_blanks", label: "Fill in the Blanks" },
  { value: "fix_text", label: "Find the Mistake" },
  { value: "drag_sentence", label: "Drag Words to Sentence" },
  { value: "listen_hotspot_sequence", label: "Listen and Find" },
];

export const dynamic = "force-dynamic";

export default async function StudentActivitiesPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const q = firstParam(params.q);
  const level = firstParam(params.level);
  const topic = firstParam(params.topic);
  const subtype = (firstParam(params.subtype) || "all") as ActivitySubtype | "all";
  const items = await searchActivityLibrary({ q, level, topic, subtype });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Activity library</h1>
        <p className="mt-2 text-neutral-700">
          Explore ready-to-play activities. This view is read-only for students.
        </p>
      </div>

      <form className="grid gap-3 rounded-lg border border-neutral-200 bg-white p-4 md:grid-cols-4">
        <label className="text-sm">
          Search title
          <input name="q" defaultValue={q} className="mt-1 block w-full rounded border px-2 py-1 text-sm" />
        </label>
        <label className="text-sm">
          Level
          <input name="level" defaultValue={level} className="mt-1 block w-full rounded border px-2 py-1 text-sm" />
        </label>
        <label className="text-sm">
          Topic
          <input name="topic" defaultValue={topic} className="mt-1 block w-full rounded border px-2 py-1 text-sm" />
        </label>
        <label className="text-sm">
          Activity type
          <select
            name="subtype"
            defaultValue={subtype}
            className="mt-1 block w-full rounded border px-2 py-1 text-sm"
          >
            <option value="all">All</option>
            {subtypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="md:col-span-4">
          <button type="submit" className="rounded bg-neutral-900 px-3 py-2 text-sm font-semibold text-white">
            Apply filters
          </button>
        </div>
      </form>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/activities/${item.id}`}
            className="block rounded-lg border border-neutral-200 bg-white p-4 transition-colors hover:bg-neutral-50"
            aria-label={`Open activity ${item.title}`}
          >
            <h2 className="text-lg font-bold text-neutral-900">{item.title}</h2>
            <div className="pointer-events-none">
              <ActivityLibraryPreview
                activityId={item.id}
                title={item.title}
                mode="student"
                payload={item.payload}
              />
            </div>
            <p className="mt-3 text-sm text-neutral-700">
              {(item.payload?.settings?.activity_subtypes?.length ?? 0) > 1 ?
                `Mixed (${item.payload?.settings?.activity_subtypes?.length} types)`
              : item.activity_subtype}{" "}
              · {item.level || "No level"} · {item.topic || "No topic"} · {item.question_count} question
              {item.question_count === 1 ? "" : "s"}
            </p>
          </Link>
        ))}
        {items.length === 0 ? (
          <p className="rounded border border-neutral-200 bg-white p-4 text-sm text-neutral-600 xl:col-span-2">
            No activities found yet.
          </p>
        ) : null}
      </section>
    </div>
  );
}
