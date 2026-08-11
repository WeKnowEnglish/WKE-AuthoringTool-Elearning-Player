import Link from "next/link";
import { createTeacherClass } from "@/lib/actions/teacher-classes";
import { TEACHER_CLASS_KIND_LABELS } from "@/lib/class-schedule/class-kind";
import { CreateClassSubmitButton } from "@/components/teacher/classes/CreateClassSubmitButton";

type Props = {
  searchParams?: Promise<{ error?: string }>;
};

function errorMessage(code: string | undefined): string | null {
  switch (code) {
    case "missing_title":
      return "Enter a class title.";
    case "create_failed":
      return "Could not create the class. Check that migrations 026 and 112 are applied.";
    default:
      return null;
  }
}

export default async function NewTeacherClassPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const error = errorMessage(params.error);

  return (
    <div className="space-y-6">
      <Link href="/teacher/classes" className="text-sm text-blue-700 underline">
        ← Classes
      </Link>
      <div>
        <h1 className="text-2xl font-bold">Create class</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Students join with a 6-character code. Set weekly meeting times after
          create so students and parents can see the next lesson.
        </p>
      </div>
      {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
      <form action={createTeacherClass} className="max-w-md space-y-4 rounded border bg-white p-6">
        <input type="hidden" name="creation_key" value={crypto.randomUUID()} />
        <div>
          <label className="block text-sm font-medium" htmlFor="title">
            Class title
          </label>
          <input
            id="title"
            name="title"
            required
            placeholder="Tuesday A2 — We Know"
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
          />
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-neutral-900">Class type</legend>
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-neutral-200 px-3 py-2">
            <input
              type="radio"
              name="class_kind"
              value="regular"
              defaultChecked
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-semibold">
                {TEACHER_CLASS_KIND_LABELS.regular}
              </span>
              <span className="block text-xs text-neutral-600">
                Recurring enrolled class with a weekly schedule.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-neutral-200 px-3 py-2">
            <input type="radio" name="class_kind" value="trial" className="mt-1" />
            <span>
              <span className="block text-sm font-semibold">
                {TEACHER_CLASS_KIND_LABELS.trial}
              </span>
              <span className="block text-xs text-neutral-600">
                One-off or placement class. Parents can also book from your trial availability;
                confirming a request creates a trial class automatically.
              </span>
            </span>
          </label>
        </fieldset>
        <CreateClassSubmitButton />
      </form>
    </div>
  );
}
