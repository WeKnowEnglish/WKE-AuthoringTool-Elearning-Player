import { TeacherAvailabilityPanel } from "@/components/teacher/trial/TeacherAvailabilityPanel";
import { TeacherTrialInbox } from "@/components/teacher/trial/TeacherTrialInbox";
import { isTeacher } from "@/lib/auth/roles";
import { getMyTeacherSpace } from "@/lib/data/teacher-space";
import {
  listMyAvailabilitySlots,
  listMyTrialBookings,
} from "@/lib/data/trial-availability";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function appOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "http://localhost:3000";
}

export default async function TeacherAvailabilityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !isTeacher(user)) redirect("/teacher/login");

  const [slots, bookings, space] = await Promise.all([
    listMyAvailabilitySlots(),
    listMyTrialBookings(),
    getMyTeacherSpace(),
  ]);

  let trialsEnabled = false;
  if (space) {
    const { data } = await supabase
      .from("teacher_spaces")
      .select("trials_enabled")
      .eq("id", space.id)
      .maybeSingle();
    trialsEnabled = Boolean(data?.trials_enabled);
  }

  const origin = appOrigin();
  const bookingLink = space?.handle
    ? `${origin}/parent/book-trial/wke/${space.handle}`
    : `${origin}/parent/book-trial/${user.id}`;
  const publicBookPath = space?.handle ? `/parent/book-trial/wke/${space.handle}` : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">
          Classroom
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
          Trial availability
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-600">
          Publish open times for trial or placement chats. Families — including prospects without
          a linked student — book a request; you confirm to create a one-off trial class.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <TeacherAvailabilityPanel
          initialSlots={slots}
          bookingLink={bookingLink}
          publicBookPath={publicBookPath}
          trialsEnabled={trialsEnabled}
          spacePublished={Boolean(space?.is_published)}
        />
        <TeacherTrialInbox initialBookings={bookings} />
      </div>
    </div>
  );
}
