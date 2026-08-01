import { ClozeChoiceWorkspace } from "@/components/teacher/activity-builder/ClozeChoiceWorkspace";
import { requireAdminActivityFormatWorkspace } from "@/lib/activity-builder/require-admin-format-workspace";

export default async function TeacherClozeChoicePage() {
  await requireAdminActivityFormatWorkspace();
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <ClozeChoiceWorkspace />
    </div>
  );
}
