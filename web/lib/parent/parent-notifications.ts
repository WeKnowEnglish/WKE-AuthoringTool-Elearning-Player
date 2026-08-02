import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ParentNotification = {
  id: string;
  type: "report_published" | "access_changed";
  title: string;
  body: string;
  linkPath: string | null;
  emailStatus: "pending" | "sent" | "failed" | "disabled";
  readAt: string | null;
  createdAt: string;
};

export type ParentNotificationPreferences = {
  inApp: boolean;
  importantEmail: boolean;
  weeklyEmail: boolean;
};

export type ParentAccountSettings = {
  displayName: string;
  preferredLanguage: "en" | "vi";
  preferences: ParentNotificationPreferences;
};

export const DEFAULT_PARENT_NOTIFICATION_PREFERENCES: ParentNotificationPreferences = {
  inApp: true,
  importantEmail: true,
  weeklyEmail: false,
};

function preferencesFromUnknown(value: unknown): ParentNotificationPreferences {
  if (!value || typeof value !== "object") return DEFAULT_PARENT_NOTIFICATION_PREFERENCES;
  const row = value as Record<string, unknown>;
  return {
    inApp: row.inApp !== false,
    importantEmail: row.importantEmail !== false,
    weeklyEmail: row.weeklyEmail === true,
  };
}

export async function listParentNotifications(limit = 50): Promise<ParentNotification[]> {
  noStore();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parent_notifications")
    .select("id, notification_type, title, body, link_path, email_status, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(limit, 100)));
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: String(row.id),
    type: row.notification_type === "access_changed" ? "access_changed" : "report_published",
    title: String(row.title),
    body: String(row.body || ""),
    linkPath: row.link_path ? String(row.link_path) : null,
    emailStatus:
      row.email_status === "sent" ||
      row.email_status === "failed" ||
      row.email_status === "disabled"
        ? row.email_status
        : "pending",
    readAt: row.read_at ? String(row.read_at) : null,
    createdAt: String(row.created_at),
  }));
}

export async function countUnreadParentNotifications(): Promise<number> {
  noStore();
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("parent_notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function getParentAccountSettings(): Promise<ParentAccountSettings> {
  noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("parent_profiles")
    .select("display_name, preferred_language, notification_preferences")
    .maybeSingle();
  if (error) throw error;
  const metadataName =
    typeof user?.user_metadata?.display_name === "string" ? user.user_metadata.display_name : "";
  return {
    displayName: String(data?.display_name || metadataName),
    preferredLanguage: data?.preferred_language === "vi" ? "vi" : "en",
    preferences: preferencesFromUnknown(data?.notification_preferences),
  };
}
