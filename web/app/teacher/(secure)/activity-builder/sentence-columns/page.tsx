import { SentenceColumnsWorkspace } from "@/components/teacher/activity-builder/SentenceColumnsWorkspace";
import { requireAdminActivityFormatWorkspace } from "@/lib/activity-builder/require-admin-format-workspace";

export default async function TeacherSentenceColumnsPage() {
  await requireAdminActivityFormatWorkspace();
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <SentenceColumnsWorkspace />
    </div>
  );
}
