import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CampusPlaySpace } from "@/components/world/play/CampusPlaySpace";
import { isStudent, isTeacher, TEACHER_DEFAULT_PATH } from "@/lib/auth/roles";
import { studentLoginPath } from "@/lib/auth/student-login";
import { createClient } from "@/lib/supabase/server";
import { isPlaySpot, playHref, playMapHref, type PlaySpotId } from "@/lib/world/play-spots";

export const metadata: Metadata = {
  title: "Inside | WKE World",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ spot: string }>;
  searchParams: Promise<{ inside?: string }>;
};

function studentDestination(spot: PlaySpotId, inside?: string): string {
  if (spot === "pet") return "/primary?nav=games";
  if (inside !== "1") return playMapHref(spot);
  return playHref(spot);
}

export default async function PrimaryWorldPlayPage({ params, searchParams }: Props) {
  const { spot } = await params;
  const { inside } = await searchParams;
  if (!isPlaySpot(spot)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(studentLoginPath("a1", studentDestination(spot, inside)));
  }
  if (isTeacher(user)) {
    redirect(TEACHER_DEFAULT_PATH);
  }
  if (!isStudent(user)) {
    redirect("/login?error=unknown_role");
  }

  if (spot === "pet") {
    redirect("/primary?nav=games");
  }
  if (inside !== "1") {
    redirect(playMapHref(spot));
  }

  return (
    <CampusPlaySpace
      spot={spot}
      backHref={playMapHref(spot)}
      designHref={spot === "cottage" ? "/primary/world/design/cottage" : undefined}
      surface="student"
    />
  );
}
