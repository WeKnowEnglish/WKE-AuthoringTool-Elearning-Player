import { LearningTrackCompilerWorkspace } from "@/components/teacher/activity-builder/LearningTrackCompilerWorkspace";
import { listTeacherClasses } from "@/lib/data/teacher-classes";

export const dynamic = "force-dynamic";

export default async function TeacherLearningTracksPage() {
  let classes: Awaited<ReturnType<typeof listTeacherClasses>> = [];
  let classLoadError = false;
  try {
    classes = await listTeacherClasses();
  } catch {
    classLoadError = true;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <LearningTrackCompilerWorkspace
        classes={classes
          .filter((item) => !item.archived_at)
          .map((item) => ({ id: item.id, title: item.title }))}
        classLoadError={classLoadError}
      />
    </div>
  );
}
