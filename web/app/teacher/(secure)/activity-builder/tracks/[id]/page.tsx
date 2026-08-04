import { ActivityTrackCompilerWorkspace } from "@/components/teacher/activity-builder/ActivityTrackCompilerWorkspace";
import { listTeacherClasses } from "@/lib/data/teacher-classes";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function TeacherActivityTrackWorkspacePage({ params }: Props) {
  const { id } = await params;
  let classes: Awaited<ReturnType<typeof listTeacherClasses>> = [];
  let classLoadError = false;
  try {
    classes = await listTeacherClasses();
  } catch {
    classLoadError = true;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ActivityTrackCompilerWorkspace
        trackId={id}
        classes={classes
          .filter((item) => !item.archived_at)
          .map((item) => ({ id: item.id, title: item.title }))}
        classLoadError={classLoadError}
      />
    </div>
  );
}
