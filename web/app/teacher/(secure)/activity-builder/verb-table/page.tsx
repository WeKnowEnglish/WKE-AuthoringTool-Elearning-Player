import { VerbTableWorkspace } from "@/components/teacher/activity-builder/VerbTableWorkspace";
import { requireAdminActivityFormatWorkspace } from "@/lib/activity-builder/require-admin-format-workspace";

export default async function TeacherVerbTablePage() {
  await requireAdminActivityFormatWorkspace();
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <VerbTableWorkspace />
    </div>
  );
}
