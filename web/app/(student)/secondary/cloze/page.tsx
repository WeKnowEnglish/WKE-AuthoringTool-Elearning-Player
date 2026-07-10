import { ClozeActivity } from "@/components/secondary/ClozeActivity";
import { requireSecondaryStudentAccess } from "../_lib/requireSecondaryAccess";

export default async function SecondaryClozePage() {
  await requireSecondaryStudentAccess();
  return <ClozeActivity />;
}
