import { PictureWritingWorkspace } from "@/components/teacher/activity-builder/PictureWritingWorkspace";
import { requireAdminActivityFormatWorkspace } from "@/lib/activity-builder/require-admin-format-workspace";

export default async function TeacherPictureWritingPage() {
  await requireAdminActivityFormatWorkspace();
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <PictureWritingWorkspace />
    </div>
  );
}
