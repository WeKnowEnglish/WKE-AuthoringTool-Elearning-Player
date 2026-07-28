import { SecondaryProgressPlaceholder } from "@/components/secondary/SecondaryProgressPlaceholder";
import { requireSecondaryStudentAccess } from "../_lib/requireSecondaryAccess";

export default async function SecondaryProgressPage() {
  await requireSecondaryStudentAccess();
  return <SecondaryProgressPlaceholder />;
}
