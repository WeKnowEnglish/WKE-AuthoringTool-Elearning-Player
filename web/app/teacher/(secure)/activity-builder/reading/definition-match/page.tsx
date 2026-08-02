import { redirect } from "next/navigation";

/** Legacy reading-admin route — bankable studio lives at /definition-match. */
export default function DefinitionMatchBuilderPage() {
  redirect("/teacher/activity-builder/definition-match");
}
