import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { logStripe } from "@/lib/billing/log";
import { stripeId } from "@/lib/billing/stripe";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";

export type PaidCheckoutSession = {
  id: string;
  payment_status?: string | null;
  payment_intent?: string | { id: string } | null;
  customer?: string | { id: string } | null;
  metadata?: Record<string, string> | null;
};

export type FulfillResult =
  | { ok: true; status: "granted" | "duplicate" | "ignored" }
  | { ok: false; error: string };

function isPaid(session: PaidCheckoutSession): boolean {
  return session.payment_status === "paid";
}

async function grantCreditsForPaidOrder(
  service: SupabaseClient,
  orderId: string,
): Promise<void> {
  const { error } = await service.rpc("grant_lesson_pack_purchase", {
    p_order_id: orderId,
  });
  if (error) throw error;
}

export async function fulfillPaidCheckoutSession(
  session: PaidCheckoutSession,
): Promise<FulfillResult> {
  if (!isPaid(session)) {
    return { ok: true, status: "ignored" };
  }

  const service = createServiceRoleSupabase();
  if (!service) return { ok: false, error: "Billing is not configured." };

  const orderId = session.metadata?.order_id?.trim() ?? "";
  if (!orderId) return { ok: false, error: "Checkout session is missing order metadata." };

  const paymentIntentId = stripeId(session.payment_intent);
  const customerId = stripeId(session.customer);
  const now = new Date().toISOString();

  const { data: paidRow, error: payError } = await service
    .from("lesson_pack_orders")
    .update({
      status: "paid",
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      stripe_customer_id: customerId,
      paid_at: now,
      updated_at: now,
    })
    .eq("id", orderId)
    .eq("status", "pending")
    .select("id, student_id, lesson_count, guardian_user_id, status")
    .maybeSingle();

  if (payError) return { ok: false, error: payError.message };

  const { data: order } = paidRow
    ? { data: paidRow }
    : await service
        .from("lesson_pack_orders")
        .select("id, student_id, lesson_count, guardian_user_id, status")
        .eq("id", orderId)
        .maybeSingle();

  if (!order) return { ok: false, error: "Order was not found." };
  if (order.status && order.status !== "paid" && !paidRow) {
    return { ok: true, status: "ignored" };
  }

  try {
    await grantCreditsForPaidOrder(service, String(order.id));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not grant lesson credits.";
    logStripe("credit_grant_failed", { orderId, message });
    return { ok: false, error: message };
  }

  if (customerId && order.guardian_user_id) {
    await service
      .from("parent_profiles")
      .update({ stripe_customer_id: customerId, updated_at: now })
      .eq("user_id", order.guardian_user_id)
      .is("stripe_customer_id", null);
  }

  return { ok: true, status: paidRow ? "granted" : "duplicate" };
}

export async function markCheckoutSessionClosed(
  sessionId: string,
  status: "canceled" | "expired",
): Promise<void> {
  const service = createServiceRoleSupabase();
  if (!service) return;
  await service
    .from("lesson_pack_orders")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_checkout_session_id", sessionId)
    .eq("status", "pending");
}

export async function claimStripeWebhookEvent(input: {
  eventId: string;
  eventType: string;
}): Promise<"claimed" | "duplicate" | "skipped"> {
  const service = createServiceRoleSupabase();
  if (!service) return "skipped";

  const { error } = await service.from("stripe_webhook_events").insert({
    event_id: input.eventId,
    event_type: input.eventType,
    status: "processed",
    received_at: new Date().toISOString(),
  });
  if (!error) return "claimed";
  if (error.code === "23505") return "duplicate";
  logStripe("webhook_claim_failed", { eventId: input.eventId, message: error.message });
  return "skipped";
}
