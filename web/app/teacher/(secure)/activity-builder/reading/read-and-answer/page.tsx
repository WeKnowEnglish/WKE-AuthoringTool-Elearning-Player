import { redirect } from "next/navigation";

/** Legacy reading-admin route — bankable studio lives at /read-and-answer. */
export default function ReadAndAnswerBuilderPage() {
  redirect("/teacher/activity-builder/read-and-answer");
}
