import { StudentLayoutClient } from "@/components/kid-ui/StudentLayoutClient";
import { getStudentClassMemberships } from "@/lib/data/student-classes";
import { PrimaryPlayerExperience } from "@/components/primary/PrimaryPlayerExperience";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const classMemberships = await getStudentClassMemberships();
  return <StudentLayoutClient classMemberships={classMemberships}><PrimaryPlayerExperience />{children}</StudentLayoutClient>;
}
