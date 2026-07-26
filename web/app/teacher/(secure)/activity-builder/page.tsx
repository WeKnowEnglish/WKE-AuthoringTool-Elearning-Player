import { ActivityBuilderHub } from "@/components/teacher/ActivityBuilderHub";
import { studioOriginFromEnv } from "@/lib/activity-builder/catalog";

export const dynamic = "force-dynamic";

export default function TeacherActivityBuilderPage() {
  return <ActivityBuilderHub studioOrigin={studioOriginFromEnv()} />;
}
