import { SpellingActivity } from "@/components/secondary/SpellingActivity";
import { requireSecondaryStudentAccess } from "../_lib/requireSecondaryAccess";

export default async function SecondarySpellingPage() {
  await requireSecondaryStudentAccess();
  return (
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <SpellingActivity />
    </div>
  );
}
