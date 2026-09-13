import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { requireAdminContext } from "@/lib/admin/admin-context";

export type PaymentReviewItem = {
  orderId: string;
  studentName: string;
  lessonCount: number;
  orderStatus: string;
  refundStatus: string;
  refundedAmount: number;
  unitAmount: number;
  quantity: number;
  currency: string;
  disputeStatus: string | null;
  updatedAt: string;
};

export async function listPaymentReviewItems(): Promise<
  { ok: true; items: PaymentReviewItem[] } | { ok: false; error: string }
> {
  noStore();
  const gate = await requireAdminContext();
  if (!gate.ok) return gate;

  const { data: orders, error } = await gate.ctx.service
    .from("lesson_pack_orders")
    .select(
      "id, student_id, lesson_count, status, refund_status, refunded_amount, unit_amount, quantity, currency, stripe_dispute_status, updated_at",
    )
    .eq("refund_review_required", true)
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) {
    if (error.code === "42703") return { ok: true, items: [] };
    return { ok: false, error: error.message };
  }

  const studentIds = [...new Set((orders ?? []).map((row) => String(row.student_id)))];
  const { data: students, error: studentError } = studentIds.length
    ? await gate.ctx.service
        .from("student_profiles")
        .select("user_id, display_name")
        .in("user_id", studentIds)
    : { data: [], error: null };
  if (studentError) return { ok: false, error: studentError.message };
  const names = new Map(
    (students ?? []).map((row) => [String(row.user_id), String(row.display_name || "Student")]),
  );

  return {
    ok: true,
    items: (orders ?? []).map((row) => ({
      orderId: String(row.id),
      studentName: names.get(String(row.student_id)) ?? "Student",
      lessonCount: Number(row.lesson_count),
      orderStatus: String(row.status),
      refundStatus: String(row.refund_status),
      refundedAmount: Number(row.refunded_amount),
      unitAmount: Number(row.unit_amount),
      quantity: Number(row.quantity),
      currency: String(row.currency),
      disputeStatus: row.stripe_dispute_status ? String(row.stripe_dispute_status) : null,
      updatedAt: String(row.updated_at),
    })),
  };
}
