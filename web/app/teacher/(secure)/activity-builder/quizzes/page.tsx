import { QuizBuilderWorkspace } from "@/components/teacher/activity-builder/QuizBuilderWorkspace";

export default async function TeacherQuizBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ activity?: string }>;
}) {
  const { activity } = await searchParams;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <QuizBuilderWorkspace initialActivityId={activity ?? null} />
    </div>
  );
}
