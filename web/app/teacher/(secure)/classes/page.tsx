import Link from "next/link";
import { listTeacherClasses } from "@/lib/data/teacher-classes";

type Props = {
  searchParams?: Promise<{ notice?: string }>;
};

export default async function TeacherClassesPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const classes = await listTeacherClasses();
  const liveRequiresPlus = sp.notice === "live_requires_plus";

  return (
    <div className="space-y-6">
      {liveRequiresPlus ? (
        <p
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
          role="status"
        >
          Live hosting (Virtual Classroom, Live Game, and in-class live tools) is available on
          Teacher Plus. Your account can still create classes, word packs, grammar posters, and
          homework.
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Classes</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Create a class, share the join code, and build your student roster.
          </p>
        </div>
        <Link
          href="/teacher/classes/new"
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
        >
          + New class
        </Link>
      </div>

      {classes.length === 0 ? (
        <p className="text-neutral-600">No classes yet. Create one to get a join code for students.</p>
      ) : (
        <ul className="space-y-3">
          {classes.map((teacherClass) => (
            <li key={teacherClass.id}>
              <Link
                href={`/teacher/classes/${teacherClass.id}`}
                className="block rounded border bg-white px-4 py-3 hover:bg-neutral-50"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{teacherClass.title}</p>
                    <p className="text-sm text-neutral-600">
                      {teacherClass.enrollmentCount} student
                      {teacherClass.enrollmentCount === 1 ? "" : "s"}
                      {teacherClass.archived_at ? " · Archived" : ""}
                    </p>
                  </div>
                  <span className="font-mono text-sm tracking-widest text-neutral-700">
                    {teacherClass.join_code}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
