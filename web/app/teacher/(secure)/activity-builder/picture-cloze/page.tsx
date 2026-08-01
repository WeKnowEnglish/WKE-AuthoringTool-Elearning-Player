import { PictureClozeWorkspace } from "@/components/teacher/activity-builder/PictureClozeWorkspace";
import { requireAdminActivityFormatWorkspace } from "@/lib/activity-builder/require-admin-format-workspace";

export default async function TeacherPictureClozePage() {
  await requireAdminActivityFormatWorkspace();
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <PictureClozeWorkspace />
    </div>
  );
}
