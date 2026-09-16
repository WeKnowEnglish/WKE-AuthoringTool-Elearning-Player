import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CampusPlaySpace } from "@/components/world/play/CampusPlaySpace";
import { isStudent, isTeacher, TEACHER_DEFAULT_PATH } from "@/lib/auth/roles";
import { studentLoginPath } from "@/lib/auth/student-login";
import { createClient } from "@/lib/supabase/server";
import { isPlaySpot } from "@/lib/world/play-spots";

export const metadata: Metadata = {
  title: "Walk around | WKE World",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ spot: string }>;
};

export default async function PrimaryWorldPlayPage({ params }: Props) {
  const { spot } = await params;
  if (!isPlaySpot(spot)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(studentLoginPath("a1", `/primary/world/play/${spot}`));
  }
  if (isTeacher(user)) {
    redirect(TEACHER_DEFAULT_PATH);
  }
  if (!isStudent(user)) {
    redirect("/login?error=unknown_role");
  }

  return <CampusPlaySpace spot={spot} backHref="/primary/world" />;
}
