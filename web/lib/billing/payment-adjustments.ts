import "server-only";

import { stripeId } from "@/lib/billing/stripe";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";

export type RefundState = "none" | "pending" | "partial" | "full" | "failed";

export function refundStateForCharge(input: {
  amountRefunded: number;
  orderTotal: number;
  refundEventStatus?: string | null;
}): RefundState {
  if (input.refundEventStatus === "failed" || input.refundEventStatus === "canceled") {
    return "failed";
  }
  if (input.amountRefunded >= input.orderTotal && input.orderTotal > 0) return "full";
  if (input.amountRefunded > 0) return "partial";
  if (input.refundEventStatus === "pending" || input.refundEventStatus === "requires_action") {
    return "pending";
  }
  return "none";
}

export async function recordStripeChargeRefund(input: {
  chargeId: string;
  paymentIntent: string | { id: string } | null;
  amount: number;
  amountRefunded: number;
  livemode: boolean;
  refundEventStatus?: string | null;
}): Promise<"recorded" | "ignored"> {
  const paymentIntentId = stripeId(input.paymentIntent);
  if (!paymentIntentId) return "ignored";
  const service = createServiceRoleSupabase();
  if (!service) throw new Error("Billing storage is not configured.");

  const { data: order, error: orderError } = await service
    .from("lesson_pack_orders")
    .select("id, status, quantity, unit_amount, currency, stripe_livemode")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();
  if (orderError) throw orderError;
  if (!order) return "ignored";

  const orderTotal = Number(order.unit_amount) * Number(order.quantity);
  if (!Number.isSafeInteger(orderTotal) || orderTotal <= 0 || input.amount !== orderTotal) {
    throw new Error("Refund charge amount does not match the lesson-pack order.");
  }
  if (order.stripe_livemode !== input.livemode) {
    throw new Error("Refund mode does not match the lesson-pack order.");
  }
  if (
    !Number.isSafeInteger(input.amountRefunded) ||
    input.amountRefunded < 0 ||
    input.amountRefunded > orderTotal
  ) {
    throw new Error("Stripe returned an invalid refunded amount.");
  }

  const refundStatus = refundStateForCharge({
    amountRefunded: input.amountRefunded,
    orderTotal,
    refundEventStatus: input.refundEventStatus,
  });
  const now = new Date().toISOString();
  const { error: updateError } = await service
    .from("lesson_pack_orders")
    .update({
      status: refundStatus === "full" ? "refunded" : order.status,
      stripe_charge_id: input.chargeId,
      refunded_amount: input.amountRefunded,
      refund_status: refundStatus,
      refunded_at: input.amountRefunded > 0 ? now : null,
      refund_review_required: refundStatus !== "none",
      updated_at: now,
    })
    .eq("id", order.id);
  if (updateError) throw updateError;
  return "recorded";
}

export async function recordStripeDispute(input: {
  disputeId: string;
  disputeStatus: string;
  charge: string | { id: string } | null;
  paymentIntent: string | { id: string } | null;
  livemode: boolean;
}): Promise<"recorded" | "ignored"> {
  const paymentIntentId = stripeId(input.paymentIntent);
  const chargeId = stripeId(input.charge);
  if (!paymentIntentId && !chargeId) return "ignored";
  const service = createServiceRoleSupabase();
  if (!service) throw new Error("Billing storage is not configured.");

  let query = service
    .from("lesson_pack_orders")
    .select("id, stripe_livemode");
  query = paymentIntentId
    ? query.eq("stripe_payment_intent_id", paymentIntentId)
    : query.eq("stripe_charge_id", chargeId);
  const { data: order, error: orderError } = await query.maybeSingle();
  if (orderError) throw orderError;
  if (!order) return "ignored";
  if (order.stripe_livemode !== input.livemode) {
    throw new Error("Dispute mode does not match the lesson-pack order.");
  }

  const { error: updateError } = await service
    .from("lesson_pack_orders")
    .update({
      stripe_charge_id: chargeId,
      stripe_dispute_id: input.disputeId,
      stripe_dispute_status: input.disputeStatus.slice(0, 80),
      refund_review_required: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);
  if (updateError) throw updateError;
  return "recorded";
}
