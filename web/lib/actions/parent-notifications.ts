"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type { ParentNotificationPreferences } from "@/lib/parent/parent-notifications";
import {
  PARENT_LANG_COOKIE,
  PARENT_LANG_COOKIE_MAX_AGE_SEC,
} from "@/lib/parent/i18n/cookie";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true; message: string } | { ok: false; error: string };

export async function markParentNotificationRead(notificationId: string): Promise<Result> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mark_parent_notification_read", {
    p_notification_id: notificationId,
  });
  if (error || data !== true) {
    return { ok: false, error: error?.message ?? "Notification not found." };
  }
  revalidatePath("/parent", "layout");
  revalidatePath("/parent/notifications");
  return { ok: true, message: "Notification marked as read." };
}

export async function markAllParentNotificationsRead(): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_all_parent_notifications_read");
  if (error) return { ok: false, error: error.message };
  revalidatePath("/parent", "layout");
  revalidatePath("/parent/notifications");
  return { ok: true, message: "All notifications marked as read." };
}

export async function updateParentAccountSettings(input: {
  displayName: string;
  preferredLanguage: string;
  preferences: ParentNotificationPreferences;
}): Promise<Result> {
  const displayName = input.displayName.trim().slice(0, 120);
  if (displayName.length < 2) return { ok: false, error: "Enter your name." };
  const preferredLanguage = input.preferredLanguage === "vi" ? "vi" : "en";
  const preferences: ParentNotificationPreferences = {
    inApp: input.preferences.inApp !== false,
    importantEmail: input.preferences.importantEmail !== false,
    weeklyEmail: input.preferences.weeklyEmail === true,
  };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return { ok: false, error: "Sign in again to save settings." };
  const { error } = await supabase.from("parent_profiles").upsert({
    user_id: user.id,
    display_name: displayName,
    preferred_language: preferredLanguage,
    notification_preferences: preferences,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };
  const cookieStore = await cookies();
  cookieStore.set(PARENT_LANG_COOKIE, preferredLanguage, {
    path: "/",
    maxAge: PARENT_LANG_COOKIE_MAX_AGE_SEC,
    sameSite: "lax",
  });
  revalidatePath("/parent", "layout");
  revalidatePath("/parent/settings");
  return { ok: true, message: "Settings saved." };
}

/** Persist language only (header / quick toggle). Keeps other profile fields. */
export async function updateParentPreferredLanguage(
  preferredLanguageInput: string,
): Promise<Result> {
  const preferredLanguage = preferredLanguageInput === "vi" ? "vi" : "en";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return { ok: false, error: "Sign in again to save language." };

  const { data: existing } = await supabase
    .from("parent_profiles")
    .select("display_name, notification_preferences")
    .eq("user_id", user.id)
    .maybeSingle();

  const metadataName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : "";
  const displayName = String(existing?.display_name || metadataName || "Parent").slice(
    0,
    120,
  );

  const { error } = await supabase.from("parent_profiles").upsert({
    user_id: user.id,
    display_name: displayName.length >= 2 ? displayName : "Parent",
    preferred_language: preferredLanguage,
    notification_preferences: existing?.notification_preferences ?? {
      inApp: true,
      importantEmail: true,
      weeklyEmail: false,
    },
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };

  const cookieStore = await cookies();
  cookieStore.set(PARENT_LANG_COOKIE, preferredLanguage, {
    path: "/",
    maxAge: PARENT_LANG_COOKIE_MAX_AGE_SEC,
    sameSite: "lax",
  });
  revalidatePath("/parent", "layout");
  revalidatePath("/parent/settings");
  return { ok: true, message: "Language saved." };
}
