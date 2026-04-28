import Link from "next/link";
import { getPublishedCatalog } from "@/lib/data/catalog";
import { CourseSelectionClient } from "./CourseSelectionClient";

export const dynamic = "force-dynamic";

export default async function LearnPage() {
  const catalog = await getPublishedCatalog();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Choose a course</h1>
      <p className="text-lg text-neutral-700">
        Enroll in a course to start learning. Modules and lessons open from
        inside each course workspace.
      </p>
      <CourseSelectionClient
        courses={catalog.courses}
        loadError={catalog.loadError}
      />
      <p className="text-sm text-neutral-600">
        <Link href="/" className="font-semibold underline">
          Home
        </Link>
      </p>
    </div>
  );
}
