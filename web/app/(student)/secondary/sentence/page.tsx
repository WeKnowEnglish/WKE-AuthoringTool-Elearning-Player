import { SentenceActivity } from "@/components/secondary/SentenceActivity";
import { requireSecondaryStudentAccess } from "../_lib/requireSecondaryAccess";

export default async function SecondarySentencePage() {
  await requireSecondaryStudentAccess();
  return <SentenceActivity />;
}
