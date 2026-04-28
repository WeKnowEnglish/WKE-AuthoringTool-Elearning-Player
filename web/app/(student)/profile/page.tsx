import Link from "next/link";
import { getPublishedCatalog } from "@/lib/data/catalog";
import { ProfileClient } from "./ProfileClient";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const catalog = await getPublishedCatalog();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">My progress</h1>
      <p className="text-lg text-neutral-700">
        Your progress is saved on this device. Skills grow as you finish
        lessons.
      </p>
      <ProfileClient
        modules={catalog.modules}
        lessons={catalog.lessons}
        skillsByLesson={catalog.skillsByLesson}
        loadError={catalog.loadError}
      />
      <p className="text-sm">
        <Link href="/learn" className="font-semibold underline">
          Courses
        </Link>
      </p>
    </div>
  );
}
