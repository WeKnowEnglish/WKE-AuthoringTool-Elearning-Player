import { ReadAndAnswerWorkspace } from "@/components/teacher/activity-builder/ReadAndAnswerWorkspace";
import { requireAdminActivityFormatWorkspace } from "@/lib/activity-builder/require-admin-format-workspace";

export default async function TeacherReadAndAnswerPage() {
  await requireAdminActivityFormatWorkspace();
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <ReadAndAnswerWorkspace />
    </div>
  );
}
