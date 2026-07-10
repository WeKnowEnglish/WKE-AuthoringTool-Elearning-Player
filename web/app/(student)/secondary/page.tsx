import { SecondaryHome } from "@/components/secondary/SecondaryHome";
import { requireSecondaryStudentAccess } from "./_lib/requireSecondaryAccess";

export default async function SecondaryHomePage() {
  await requireSecondaryStudentAccess();
  return <SecondaryHome />;
}
