import { ActivityTrackCreateForm } from "@/components/teacher/activity-builder/ActivityTrackCreateForm";

export default function TeacherActivityTrackNewPage() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
        <ActivityTrackCreateForm />
      </div>
    </div>
  );
}
