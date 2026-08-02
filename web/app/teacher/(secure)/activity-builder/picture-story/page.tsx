import { PictureStoryWorkspace } from "@/components/teacher/activity-builder/PictureStoryWorkspace";
import { requireAdminActivityFormatWorkspace } from "@/lib/activity-builder/require-admin-format-workspace";

export default async function TeacherPictureStoryPage() {
  await requireAdminActivityFormatWorkspace();
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <PictureStoryWorkspace />
    </div>
  );
}
