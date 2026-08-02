import { SecondaryClassEntry } from "@/components/secondary/SecondaryClassEntry";
import { getStudentClassMemberships } from "@/lib/data/student-classes";
import { redirect } from "next/navigation";
import { requireSecondaryStudentAccess } from "../_lib/requireSecondaryAccess";

export default async function SecondaryClassPage() {
  await requireSecondaryStudentAccess();
  const classMemberships = await getStudentClassMemberships();
  if (classMemberships.length === 0) redirect("/join-class");
  return <SecondaryClassEntry classMemberships={classMemberships} />;
}
