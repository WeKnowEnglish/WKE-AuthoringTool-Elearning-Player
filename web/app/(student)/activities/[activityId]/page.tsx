import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityLibraryPreview } from "@/components/teacher/activities/ActivityLibraryPreview";
import { getPublishedActivityLibraryItemById } from "@/lib/data/teacher";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ activityId: string }>;
};

export default async function StudentActivityPage({ params }: Props) {
  const { activityId } = await params;
  const item = await getPublishedActivityLibraryItemById(activityId);
  if (!item) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{item.title}</h1>
        </div>
        <Link
          href="/activities"
          className="rounded border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-100"
        >
          Back to library
        </Link>
      </div>
      <ActivityLibraryPreview
        activityId={item.id}
        title={item.title}
        mode="student"
        payload={item.payload}
      />
    </div>
  );
}
