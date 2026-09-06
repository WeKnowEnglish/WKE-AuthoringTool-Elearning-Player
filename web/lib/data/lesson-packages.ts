import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { requireAdminContext } from "@/lib/admin/admin-context";
import { createClient } from "@/lib/supabase/server";
import {
  mapLessonPackage,
  mapLessonPackOrder,
  type LessonPackage,
  type LessonPackOrder,
  type StudentLessonCredit,
} from "@/lib/billing/types";

const PACKAGE_COLUMNS =
  "id, name, description, lesson_count, unit_amount, currency, is_active, sort_order, updated_at";

export async function listActiveLessonPackages(): Promise<LessonPackage[]> {
  noStore();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lesson_packages")
    .select(PACKAGE_COLUMNS)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    if (error.code === "42P01" || error.message.includes("lesson_packages")) {
      return [];
    }
    throw error;
  }
  return (data ?? []).map(mapLessonPackage);
}

export async function listAdminLessonPackages(): Promise<
  { ok: true; packages: LessonPackage[] } | { ok: false; error: string }
> {
  noStore();
  const gate = await requireAdminContext();
  if (!gate.ok) return gate;
  const { data, error } = await gate.ctx.service
    .from("lesson_packages")
    .select(PACKAGE_COLUMNS)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return { ok: false, error: error.message };
  return { ok: true, packages: (data ?? []).map(mapLessonPackage) };
}

export async function listParentLessonOrders(): Promise<LessonPackOrder[]> {
  noStore();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lesson_pack_orders")
    .select(
      "id, student_id, quantity, lesson_count, unit_amount, currency, status, paid_at, created_at, lesson_packages(name)",
    )
    .order("created_at", { ascending: false })
    .limit(12);
  if (error) {
    if (error.code === "42P01" || error.message.includes("lesson_pack_orders")) {
      return [];
    }
    throw error;
  }
  return (data ?? []).map(mapLessonPackOrder);
}

export async function listParentStudentLessonCredits(
  studentIds: string[],
): Promise<StudentLessonCredit[]> {
  noStore();
  if (studentIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_lesson_credits")
    .select("student_id, remaining_lessons")
    .in("student_id", studentIds);
  if (error) {
    if (error.code === "42P01" || error.message.includes("student_lesson_credits")) {
      return [];
    }
    throw error;
  }
  return (data ?? []).map((row) => ({
    studentId: String(row.student_id),
    remainingLessons: Number(row.remaining_lessons ?? 0),
  }));
}

export async function getParentLessonOrderBySessionId(
  sessionId: string,
  guardianUserId: string,
): Promise<LessonPackOrder | null> {
  noStore();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lesson_pack_orders")
    .select(
      "id, student_id, quantity, lesson_count, unit_amount, currency, status, paid_at, created_at, lesson_packages(name)",
    )
    .eq("stripe_checkout_session_id", sessionId)
    .eq("guardian_user_id", guardianUserId)
    .maybeSingle();
  if (error || !data) return null;
  return mapLessonPackOrder(data);
}
