import { ClassPostsPanel } from "@/components/teacher/class-hub/ClassPostsPanel";
import type { ClassHomework } from "@/lib/class-homework/types";
import type { ClassPost } from "@/lib/class-posts/types";
import type { TeacherSpaceItemSummary } from "@/lib/teacher-space/types";

type Props = {
  classId: string;
  archived: boolean;
  classPosts: ClassPost[];
  homework: ClassHomework[];
  spaceItems: TeacherSpaceItemSummary[];
};

export function ClassStreamTab({
  classId,
  archived,
  classPosts,
  homework,
  spaceItems,
}: Props) {
  return (
    <div className="space-y-4">
      <ClassPostsPanel
        classId={classId}
        archived={archived}
        initialPosts={classPosts}
        homework={homework}
        spaceItems={spaceItems}
      />
    </div>
  );
}
