import { SecondaryLearnHome } from "@/components/secondary/SecondaryLearnHome";
import { requireSecondaryStudentAccess } from "../_lib/requireSecondaryAccess";

export default async function SecondaryLearnPage() {
  await requireSecondaryStudentAccess();
  return <SecondaryLearnHome />;
}
