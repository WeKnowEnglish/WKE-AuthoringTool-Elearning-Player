import Link from "next/link";
import { createTeacherClass } from "@/lib/actions/teacher-classes";

type Props = {
  searchParams?: Promise<{ error?: string }>;
};

function errorMessage(code: string | undefined): string | null {
  switch (code) {
    case "missing_title":
      return "Enter a class title.";
    case "create_failed":
      return "Could not create the class. Check that migration 026 is applied.";
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
          Students join with a 6-character code. Mastery diagnostics come in T2.
        </p>
      </div>
      {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
      <form action={createTeacherClass} className="max-w-md space-y-4 rounded border bg-white p-6">
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
        <button type="submit" className="rounded bg-neutral-900 px-4 py-2 font-semibold text-white">
          Create class
        </button>
      </form>
    </div>
  );
}
