import { redirect } from "next/navigation";

/** Legacy reading-admin route — bankable studio lives at /cloze-choice. */
export default function ClozeChoiceBuilderPage() {
  redirect("/teacher/activity-builder/cloze-choice");
}
