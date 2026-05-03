import {
  createActivityLibraryItem,
  deleteActivityLibraryItem,
  openActivityInCourseEditor,
  updateActivityLibraryItem,
} from "@/lib/actions/teacher";
import { ActivityLibraryPreview } from "@/components/teacher/activities/ActivityLibraryPreview";
import { ActivityLibraryTableImport } from "@/components/teacher/activities/ActivityLibraryTableImport";
import { ConfirmSubmitButton } from "@/components/teacher/ConfirmSubmitButton";
import {
  type ActivitySubtype,
  searchActivityLibrary,
} from "@/lib/data/teacher";
import { ACTIVITY_LEVEL_SECTIONS, groupItemsByActivityLevel } from "@/lib/activity-library-levels";
import { ActivityLevelCarousel } from "@/components/activities/ActivityLevelCarousel";

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
  { value: "letter_mixup", label: "Scramble Letters" },
  { value: "listen_hotspot_sequence", label: "Listen and Find" },
];

export default async function TeacherActivitiesPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const q = firstParam(params.q);
  const level = firstParam(params.level);
  const topic = firstParam(params.topic);
  const subtype = (firstParam(params.subtype) || "all") as ActivitySubtype | "all";
  const items = await searchActivityLibrary({ q, level, topic, subtype });
  const byLevel = groupItemsByActivityLevel(items);
  const carouselCardClass =
    "min-w-[min(280px,calc(100vw-2.5rem))] max-w-md shrink-0 snap-start";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Activity Library</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        <aside className="lg:sticky lg:top-4 lg:col-span-1 space-y-6">
          <ActivityLibraryTableImport />

          <section className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="text-sm font-bold text-neutral-900">Create Activity Set</h2>
            <form action={createActivityLibraryItem} className="mt-3 grid gap-3">
              <label className="text-sm">
                Title
                <input name="title" required className="mt-1 block w-full rounded border px-2 py-1 text-sm" />
              </label>
              <label className="text-sm">
                Activity types (select one or more)
                <div className="mt-2 grid grid-cols-1 gap-2 rounded border p-2">
                  {subtypeOptions.map((option, index) => (
                    <label key={option.value} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="activity_subtypes"
                        value={option.value}
                        defaultChecked={index === 0}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </label>
              <label className="text-sm">
                Level
                <input
                  name="level"
                  placeholder="A1, A2..."
                  className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                />
              </label>
              <label className="text-sm">
                Topic
                <input
                  name="topic"
                  placeholder="Food, Travel..."
                  className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                />
              </label>
              <label className="text-sm">
                Vocabulary list (comma or new line)
                <textarea
                  name="vocabulary_raw"
                  rows={5}
                  placeholder="apple, banana, orange"
                  className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                />
              </label>
              <div>
                <button type="submit" className="rounded bg-neutral-900 px-4 py-2 text-sm font-semibold text-white">
                  Generate and save
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="text-sm font-bold text-neutral-900">Filter Library</h2>
            <form className="mt-3 grid gap-3">
              <label className="text-sm">
                Search title
                <input name="q" defaultValue={q} className="mt-1 block w-full rounded border px-2 py-1 text-sm" />
              </label>
              <label className="text-sm">
                Level
                <input
                  name="level"
                  defaultValue={level}
                  className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                />
              </label>
              <label className="text-sm">
                Topic
                <input
                  name="topic"
                  defaultValue={topic}
                  className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                />
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
              <div>
                <button type="submit" className="rounded bg-neutral-900 px-3 py-2 text-sm font-semibold text-white">
                  Apply filters
                </button>
              </div>
            </form>
          </section>
        </aside>

        <section className="lg:col-span-2 space-y-10">
          {items.length === 0 ? (
            <p className="rounded border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
              No activities found. Create your first activity set above.
            </p>
          ) : (
            ACTIVITY_LEVEL_SECTIONS.map(({ band, label }) => {
              const bandItems = byLevel.get(band) ?? [];
              if (bandItems.length === 0) return null;
              return (
                <ActivityLevelCarousel key={band} sectionId={band} title={label}>
                  {bandItems.map((item) => (
                    <div key={item.id} className={carouselCardClass}>
                      <article className="h-full rounded-lg border border-neutral-200 bg-white p-4">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-semibold ${
                              item.published ?
                                "bg-emerald-100 text-emerald-900"
                              : "bg-neutral-200 text-neutral-700"
                            }`}
                          >
                            {item.published ? "Published to library" : "Draft (library)"}
                          </span>
                        </div>
                        <ActivityLibraryPreview activityId={item.id} title={item.title} payload={item.payload} />

                        <p className="mt-3 text-sm text-neutral-700">
                          {(item.payload?.settings?.activity_subtypes?.length ?? 0) > 1 ?
                            `Mixed (${item.payload?.settings?.activity_subtypes?.length} types)`
                          : item.activity_subtype}{" "}
                          · {item.level || "No level"} · {item.topic || "No topic"} · {item.question_count} question
                          {item.question_count === 1 ? "" : "s"}
                        </p>

                        <details className="mt-4 rounded border border-neutral-200 p-3">
                          <summary className="cursor-pointer text-sm font-semibold">Edit activity</summary>
                          <form action={updateActivityLibraryItem} className="mt-3 grid gap-3 md:grid-cols-2">
                            <input type="hidden" name="id" value={item.id} />
                            <input
                              type="hidden"
                              name="editor_module_id"
                              value={item.payload?.settings?.editor_module_id ?? ""}
                            />
                            <input
                              type="hidden"
                              name="editor_lesson_id"
                              value={item.payload?.settings?.editor_lesson_id ?? ""}
                            />
                            <label className="text-sm">
                              Title
                              <input
                                name="title"
                                defaultValue={item.title}
                                required
                                className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                              />
                            </label>
                            <label className="text-sm">
                              Level
                              <input
                                name="level"
                                defaultValue={item.level ?? ""}
                                className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                              />
                            </label>
                            <label className="text-sm md:col-span-2">
                              Topic
                              <input
                                name="topic"
                                defaultValue={item.topic ?? ""}
                                className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                              />
                            </label>
                            <label className="text-sm md:col-span-2">
                              Vocabulary
                              <textarea
                                name="vocabulary_raw"
                                rows={2}
                                defaultValue={(item.vocabulary ?? []).join(", ")}
                                className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                              />
                            </label>
                            <label className="text-sm md:col-span-2">
                              <span className="mb-1 block">Question editing</span>
                              <button
                                type="submit"
                                formAction={openActivityInCourseEditor}
                                className="rounded border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-800"
                              >
                                Edit questions in course editor
                              </button>
                            </label>
                            <label className="flex items-center gap-2 text-sm md:col-span-2">
                              <input type="hidden" name="shuffle_questions" value="0" />
                              <input
                                type="checkbox"
                                name="shuffle_questions"
                                value="1"
                                defaultChecked={item.payload?.settings?.shuffle_questions === true}
                              />
                              Shuffle questions in activity set
                            </label>
                            <label className="flex items-center gap-2 text-sm md:col-span-2">
                              <input type="hidden" name="shuffle_answer_options_each_replay" value="0" />
                              <input
                                type="checkbox"
                                name="shuffle_answer_options_each_replay"
                                value="1"
                                defaultChecked={item.payload?.settings?.shuffle_answer_options_each_replay !== false}
                              />
                              Shuffle answer option order each time the game is replayed
                            </label>
                            <label className="flex items-center gap-2 text-sm md:col-span-2">
                              <input type="hidden" name="auto_advance_on_pass_default" value="0" />
                              <input
                                type="checkbox"
                                name="auto_advance_on_pass_default"
                                value="1"
                                defaultChecked={item.payload?.settings?.auto_advance_on_pass_default === true}
                              />
                              Auto-advance after correct answer (default for this activity)
                            </label>
                            <div className="md:col-span-2 flex flex-wrap gap-2">
                              <button
                                type="submit"
                                className="rounded bg-neutral-900 px-3 py-2 text-sm font-semibold text-white"
                              >
                                Save edits
                              </button>
                            </div>
                          </form>

                          <form action={deleteActivityLibraryItem} className="mt-4">
                            <input type="hidden" name="id" value={item.id} />
                            <ConfirmSubmitButton
                              type="submit"
                              confirmMessage={`Delete activity "${item.title}"? This cannot be undone.`}
                              className="rounded border border-red-300 px-3 py-2 text-sm font-semibold text-red-800"
                            >
                              Delete activity
                            </ConfirmSubmitButton>
                          </form>
                        </details>
                      </article>
                    </div>
                  ))}
                </ActivityLevelCarousel>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}
