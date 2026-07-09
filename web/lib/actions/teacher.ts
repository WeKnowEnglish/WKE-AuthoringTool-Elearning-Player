"use server";

import { createClient } from "@/lib/supabase/server";

export async function requireTeacher() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "teacher") {
    throw new Error("Teacher authentication required.");
  }
  return { supabase, user };
}
