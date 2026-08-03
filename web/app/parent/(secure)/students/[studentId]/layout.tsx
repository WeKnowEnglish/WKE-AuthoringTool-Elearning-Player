import { notFound } from "next/navigation";
import { listParentLinkedStudents } from "@/lib/parent/guardian-data";

export default async function SelectedParentStudentLayout(props: {
  children: React.ReactNode;
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await props.params;
  const students = await listParentLinkedStudents();
  const student = students.find((item) => item.studentId === studentId);
  if (!student) notFound();

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-indigo-600">
          {student.classTitle ?? "Learning overview"}
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">{student.displayName}</h1>
      </header>
      {props.children}
    </div>
  );
}
