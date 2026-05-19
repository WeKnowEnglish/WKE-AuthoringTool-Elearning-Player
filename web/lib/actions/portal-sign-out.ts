"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LEARNING_BAND_COOKIE } from "@/lib/learning-band";
import { createClient } from "@/lib/supabase/server";

/** End the Supabase session and return to the public level landing page. */
export async function portalSignOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const cookieStore = await cookies();
  cookieStore.set(LEARNING_BAND_COOKIE, "", {
    path: "/",
    maxAge: 0,
  });

  redirect("/");
}
