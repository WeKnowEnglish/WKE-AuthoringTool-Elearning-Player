import { DefinitionMatchWorkspace } from "@/components/teacher/activity-builder/DefinitionMatchWorkspace";
import { requireAdminActivityFormatWorkspace } from "@/lib/activity-builder/require-admin-format-workspace";

export default async function TeacherDefinitionMatchPage() {
  await requireAdminActivityFormatWorkspace();
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <DefinitionMatchWorkspace />
    </div>
  );
}
