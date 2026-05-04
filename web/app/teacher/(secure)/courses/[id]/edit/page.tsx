import Link from "next/link";
import { notFound } from "next/navigation";
import { CourseCoverMediaFields } from "@/components/teacher/CourseCoverMediaFields";
import { saveCourse } from "@/lib/actions/teacher";
import { getCourse } from "@/lib/data/teacher";

type Props = { params: Promise<{ id: string }> };

export default async function EditCoursePage({ params }: Props) {
  const { id } = await params;
  let course;
  try {
    course = await getCourse(id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link href={`/teacher/courses/${id}`} className="text-sm text-blue-700 underline">
        ← Course workspace
      </Link>
      <h1 className="text-2xl font-bold">Edit course details</h1>
      <form action={saveCourse} className="max-w-md space-y-4 rounded border bg-white p-6">
        <input type="hidden" name="id" value={course.id} />
        <div>
          <label className="block text-sm font-medium">Title</label>
          <input
            name="title"
            required
            defaultValue={course.title}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Slug</label>
          <input
            name="slug"
            required
            defaultValue={course.slug}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Target</label>
          <input
            name="target"
            required
            defaultValue={course.target}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Order</label>
          <input
            name="order_index"
            type="number"
            defaultValue={course.order_index}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>
        <CourseCoverMediaFields
          initialCoverImageUrl={course.cover_image_url ?? ""}
          initialCoverVideoUrl={course.cover_video_url ?? ""}
        />
        <div>
          <label className="block text-sm font-medium">Standards</label>
          <textarea
            name="standards"
            rows={5}
            defaultValue={course.standards ?? ""}
            placeholder="List curriculum standards this course targets."
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Outcomes</label>
          <textarea
            name="outcomes"
            rows={5}
            defaultValue={course.outcomes ?? ""}
            placeholder="List measurable outcomes for students."
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="published" defaultChecked={course.published} />
          Published
        </label>
        <button type="submit" className="rounded bg-neutral-900 px-4 py-2 font-semibold text-white">
          Save course
        </button>
      </form>
    </div>
  );
}
