import { LearningTrackCompilerWorkspace } from "@/components/teacher/activity-builder/LearningTrackCompilerWorkspace";

export const dynamic = "force-dynamic";

export default function TeacherLearningTracksPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <LearningTrackCompilerWorkspace />
    </div>
  );
}
