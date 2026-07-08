import { ClozeActivity } from "@/components/secondary/ClozeActivity";
import { requireSecondaryStudentAccess } from "../_lib/requireSecondaryAccess";

export default async function SecondaryClozePage() {
  await requireSecondaryStudentAccess();
  return (
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <ClozeActivity />
    </div>
  );
}
