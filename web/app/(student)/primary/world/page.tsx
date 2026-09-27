import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WkeWorldMap } from "@/components/world/WkeWorldMap";
import { isHomeSpotId } from "@/components/world/world-landmasses";
import { isStudent, isTeacher, TEACHER_DEFAULT_PATH } from "@/lib/auth/roles";
import { studentLoginPath } from "@/lib/auth/student-login";
import { getStudentClassMemberships } from "@/lib/data/student-classes";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "WKE World",
  description: "Walk your globe. Go inside the house or school, or play with your pet.",
  robots: { index: false, follow: false },
};

function studentNameFromMetadata(metadata: Record<string, unknown> | undefined): string | null {
  const displayName = metadata?.display_name;
  if (typeof displayName === "string" && displayName.trim()) return displayName.trim();
  const username = metadata?.username;
  if (typeof username === "string" && username.trim()) return username.trim();
  return null;
}

type Props = {
  searchParams: Promise<{ at?: string }>;
};

export default async function PrimaryWorldPage({ searchParams }: Props) {
  const { at } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(studentLoginPath("a1", "/primary/world"));
  }
  if (isTeacher(user)) {
    redirect(TEACHER_DEFAULT_PATH);
  }
  if (!isStudent(user)) {
    redirect("/login?error=unknown_role");
  }

  const classes = await getStudentClassMemberships();

  return (
    <WkeWorldMap
      studentKey={user.id}
      studentName={studentNameFromMetadata(user.user_metadata as Record<string, unknown>)}
      classTitle={classes[0]?.title ?? null}
      spawnSpot={isHomeSpotId(at) ? at : null}
    />
  );
}
