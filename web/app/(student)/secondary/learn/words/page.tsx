import { SecondaryLearnWordsHome } from "@/components/secondary/SecondaryLearnWordsHome";
import { requireSecondaryStudentAccess } from "../../_lib/requireSecondaryAccess";

export default async function SecondaryLearnWordsPage() {
  await requireSecondaryStudentAccess();
  return <SecondaryLearnWordsHome />;
}
