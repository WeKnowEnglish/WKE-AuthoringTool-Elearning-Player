import Link from "next/link";
import { getPublishedCatalog } from "@/lib/data/catalog";
import { ProfileClient } from "./ProfileClient";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const catalog = await getPublishedCatalog();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Achievements</h1>
      <p className="text-lg text-neutral-700">
        Track your learning and spend gold on sticker rewards.
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
