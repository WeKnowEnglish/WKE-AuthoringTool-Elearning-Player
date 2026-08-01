import { redirect } from "next/navigation";

/** Legacy reading-admin route — bankable studio lives at /cloze-open. */
export default function ClozeOpenBuilderPage() {
  redirect("/teacher/activity-builder/cloze-open");
}
