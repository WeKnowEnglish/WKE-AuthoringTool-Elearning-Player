import { TeacherClassesHome } from "@/components/teacher/TeacherClassesHome";
import { listMyStudioActivities } from "@/lib/data/studio-activities";
import { listTeacherClasses } from "@/lib/data/teacher-classes";
import {
  getMySpaceItemIdsByActivity,
  getMyTeacherSpace,
  listMyTeacherSpaceItems,
} from "@/lib/data/teacher-space";

type Props = {
  searchParams?: Promise<{
    notice?: string;
    bank?: string;
    space?: string;
    activity?: string;
  }>;
};

function appOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "http://localhost:3000";
}

export default async function TeacherClassesPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const [classes, activities, space, spaceItems, spaceItemByActivityId] =
    await Promise.all([
      listTeacherClasses(),
      listMyStudioActivities(),
      getMyTeacherSpace(),
      listMyTeacherSpaceItems(),
      getMySpaceItemIdsByActivity(),
    ]);
  const liveRequiresPlus = sp.notice === "live_requires_plus";
  const initialTab = sp.space === "1" ? ("wall" as const) : ("classes" as const);
  const initialShowBank = sp.bank === "1" || Boolean(sp.activity?.trim());
  const initialActivityId = sp.activity?.trim() || null;

  return (
    <TeacherClassesHome
      classes={classes}
      activities={activities}
      space={space}
      spaceItems={spaceItems}
      spaceItemByActivityId={spaceItemByActivityId}
      origin={appOrigin()}
      liveRequiresPlus={liveRequiresPlus}
      initialTab={initialTab}
      initialShowBank={initialShowBank}
      initialActivityId={initialActivityId}
    />
  );
}
