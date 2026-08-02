import { WordAnnotationWorkspace } from "@/components/teacher/activity-builder/WordAnnotationWorkspace";
import { requireAdminActivityFormatWorkspace } from "@/lib/activity-builder/require-admin-format-workspace";

export default async function TeacherWordAnnotationPage() {
  await requireAdminActivityFormatWorkspace();
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <WordAnnotationWorkspace />
    </div>
  );
}
