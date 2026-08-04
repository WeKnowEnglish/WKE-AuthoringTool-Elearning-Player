import { redirect } from "next/navigation";

/** Learning Track Compiler lives in Track Builder Practice mode. */
export default function TeacherLearningTracksRedirectPage() {
  redirect("/teacher/activity-builder/tracks");
}
