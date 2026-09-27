import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  validatePaidCheckoutSession,
  type CheckoutOrderForValidation,
} from "@/lib/billing/checkout-validation";
import { logStripe } from "@/lib/billing/log";
import { stripeId } from "@/lib/billing/stripe";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";

export type PaidCheckoutSession = {
  id: string;
  payment_status?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  client_reference_id?: string | null;
  livemode?: boolean;
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
  if (!isPaid(session)) return { ok: true, status: "ignored" };

  const service = createServiceRoleSupabase();
  if (!service) return { ok: false, error: "Billing is not configured." };

  const orderId = session.metadata?.order_id?.trim() ?? "";
  if (!orderId) return { ok: false, error: "Checkout session is missing order metadata." };
  const paymentIntentId = stripeId(session.payment_intent);
  if (!paymentIntentId) {
    return { ok: false, error: "Paid checkout session is missing its payment reference." };
  }
  const customerId = stripeId(session.customer);
  const now = new Date().toISOString();

  const { data: rawOrder, error: orderError } = await service
    .from("lesson_pack_orders")
    .select(
      "id, guardian_user_id, student_id, package_id, quantity, lesson_count, unit_amount, currency, status, stripe_checkout_session_id, stripe_livemode",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) return { ok: false, error: orderError.message };
  if (!rawOrder) return { ok: false, error: "Order was not found." };

  const orderForValidation: CheckoutOrderForValidation = {
    id: String(rawOrder.id),
    guardian_user_id: String(rawOrder.guardian_user_id),
    student_id: String(rawOrder.student_id),
    package_id: String(rawOrder.package_id),
    quantity: Number(rawOrder.quantity),
    lesson_count: Number(rawOrder.lesson_count),
    unit_amount: Number(rawOrder.unit_amount),
    currency: String(rawOrder.currency),
    status: String(rawOrder.status),
    stripe_checkout_session_id: rawOrder.stripe_checkout_session_id
      ? String(rawOrder.stripe_checkout_session_id)
      : null,
    stripe_livemode:
      typeof rawOrder.stripe_livemode === "boolean" ? rawOrder.stripe_livemode : null,
  };
  const validation = validatePaidCheckoutSession(session, orderForValidation);
  if (!validation.ok) return validation;

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

  const { data: paidOrder } = paidRow
    ? { data: paidRow }
    : await service
        .from("lesson_pack_orders")
        .select("id, student_id, lesson_count, guardian_user_id, status")
        .eq("id", orderId)
        .maybeSingle();
  if (!paidOrder) return { ok: false, error: "Order was not found." };
  if (paidOrder.status && paidOrder.status !== "paid" && !paidRow) {
    return { ok: true, status: "ignored" };
  }

  try {
    await grantCreditsForPaidOrder(service, String(paidOrder.id));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not grant lesson credits.";
    logStripe("credit_grant_failed", { orderId, message });
    return { ok: false, error: message };
  }

  if (customerId && paidOrder.guardian_user_id) {
    await service
      .from("parent_profiles")
      .update({ stripe_customer_id: customerId, updated_at: now })
      .eq("user_id", paidOrder.guardian_user_id)
      .is("stripe_customer_id", null);
  }
  return { ok: true, status: paidRow ? "granted" : "duplicate" };
}

export async function markCheckoutSessionClosed(
  sessionId: string,
  status: "canceled" | "expired",
): Promise<void> {
  const service = createServiceRoleSupabase();
  if (!service) throw new Error("Billing storage is not configured.");
  const { error } = await service
    .from("lesson_pack_orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("stripe_checkout_session_id", sessionId)
    .eq("status", "pending");
  if (error) throw error;
}

export async function claimStripeWebhookEvent(input: {
  eventId: string;
  eventType: string;
}): Promise<
  | { ok: true; status: "claimed" | "duplicate" | "busy" }
  | { ok: false; error: string }
> {
  const service = createServiceRoleSupabase();
  if (!service) return { ok: false, error: "Billing storage is not configured." };
  const { data, error } = await service.rpc("claim_stripe_webhook_event", {
    p_event_id: input.eventId,
    p_event_type: input.eventType,
  });
  if (error) {
    logStripe("webhook_claim_failed", { eventId: input.eventId, message: error.message });
    return { ok: false, error: error.message };
  }
  const status = data === "claimed" ? "claimed" : data === "busy" ? "busy" : "duplicate";
  return { ok: true, status };
}

export async function completeStripeWebhookEvent(input: {
  eventId: string;
  status: "processed" | "error" | "ignored";
  error?: string;
}): Promise<void> {
  const service = createServiceRoleSupabase();
  if (!service) throw new Error("Billing storage is not configured.");
  const now = new Date().toISOString();
  const { error } = await service
    .from("stripe_webhook_events")
    .update({
      status: input.status,
      error_message: input.error?.slice(0, 1000) ?? null,
      processed_at: input.status === "processed" || input.status === "ignored" ? now : null,
      updated_at: now,
    })
    .eq("event_id", input.eventId);
  if (error) throw error;
}
