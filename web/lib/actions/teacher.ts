"use server";

import { isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export async function requireTeacher() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isTeacher(user)) {
    throw new Error("Teacher authentication required.");
  }
  return { supabase, user };
}
