import { ParentManageChildrenView } from "@/components/parent/ParentManageChildrenView";
import { listParentLinkedStudents } from "@/lib/parent/guardian-data";

export default async function ManageChildrenPage() {
  const students = await listParentLinkedStudents();
  return <ParentManageChildrenView students={students} />;
}
