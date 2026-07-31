import { SecondaryClassEntry } from "@/components/secondary/SecondaryClassEntry";
import { getStudentClassMemberships } from "@/lib/data/student-classes";
import { requireSecondaryStudentAccess } from "../_lib/requireSecondaryAccess";

export default async function SecondaryClassPage() {
  await requireSecondaryStudentAccess();
  const classMemberships = await getStudentClassMemberships();
  return <SecondaryClassEntry classMemberships={classMemberships} />;
}
