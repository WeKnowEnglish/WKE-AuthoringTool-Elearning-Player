import { ActivityTrackList } from "@/components/teacher/activity-builder/ActivityTrackList";

export default function TeacherActivityTracksPage() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
        <ActivityTrackList />
      </div>
    </div>
  );
}
