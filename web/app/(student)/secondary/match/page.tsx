import { MatchActivity } from "@/components/secondary/MatchActivity";
import { requireSecondaryStudentAccess } from "../_lib/requireSecondaryAccess";

export default async function SecondaryMatchPage() {
  await requireSecondaryStudentAccess();
  return (
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <MatchActivity />
    </div>
  );
}
