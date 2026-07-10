import { SpellingActivity } from "@/components/secondary/SpellingActivity";
import { requireSecondaryStudentAccess } from "../_lib/requireSecondaryAccess";

export default async function SecondarySpellingPage() {
  await requireSecondaryStudentAccess();
  return <SpellingActivity />;
}
