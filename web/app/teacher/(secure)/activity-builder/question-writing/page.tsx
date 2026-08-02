import { QuestionWritingWorkspace } from "@/components/teacher/activity-builder/QuestionWritingWorkspace";
import { requireAdminActivityFormatWorkspace } from "@/lib/activity-builder/require-admin-format-workspace";

export default async function TeacherQuestionWritingPage() {
  await requireAdminActivityFormatWorkspace();
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <QuestionWritingWorkspace />
    </div>
  );
}
