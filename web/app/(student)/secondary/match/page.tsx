import { MatchActivity } from "@/components/secondary/MatchActivity";
import { requireSecondaryStudentAccess } from "../_lib/requireSecondaryAccess";

export default async function SecondaryMatchPage() {
  await requireSecondaryStudentAccess();
  return <MatchActivity />;
}
