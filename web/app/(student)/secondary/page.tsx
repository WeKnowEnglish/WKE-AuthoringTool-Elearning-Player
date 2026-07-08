import { SecondaryHome } from "@/components/secondary/SecondaryHome";
import { requireSecondaryStudentAccess } from "./_lib/requireSecondaryAccess";

export default async function SecondaryHomePage() {
  await requireSecondaryStudentAccess();
  return (
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <SecondaryHome />
    </div>
  );
}
