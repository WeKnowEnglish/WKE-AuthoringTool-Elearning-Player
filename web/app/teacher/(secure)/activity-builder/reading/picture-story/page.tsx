import { redirect } from "next/navigation";

/** Legacy reading-admin route — bankable studio lives at /picture-story. */
export default function PictureStoryBuilderPage() {
  redirect("/teacher/activity-builder/picture-story");
}
