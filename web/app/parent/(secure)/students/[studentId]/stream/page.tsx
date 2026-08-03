import { ParentStreamFeed } from "@/components/parent/ParentStreamFeed";
import { listParentLinkedStudents } from "@/lib/parent/guardian-data";
import { listParentStream } from "@/lib/parent/parent-stream";

export default async function ParentStudentStreamPage(props: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await props.params;
  const [students, items] = await Promise.all([
    listParentLinkedStudents(),
    listParentStream(studentId),
  ]);
  const student = students.find((candidate) => candidate.studentId === studentId);

  return <ParentStreamFeed studentName={student?.displayName ?? "Your child"} items={items} />;
}
