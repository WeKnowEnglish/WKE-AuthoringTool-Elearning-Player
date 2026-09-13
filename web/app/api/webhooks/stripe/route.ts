import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  claimStripeWebhookEvent,
  completeStripeWebhookEvent,
  fulfillPaidCheckoutSession,
  markCheckoutSessionClosed,
} from "@/lib/billing/fulfill-checkout";
import { logStripe } from "@/lib/billing/log";
import {
  recordStripeChargeRefund,
  recordStripeDispute,
} from "@/lib/billing/payment-adjustments";
import { getStripe, stripeId } from "@/lib/billing/stripe";
import {
  isClosedCheckoutEventType,
  isDisputeEventType,
  isPaidCheckoutEventType,
  isRefundEventType,
  isSupportedStripeEventType,
  stripeEventType,
} from "@/lib/billing/webhook-events";
import { getStripeWebhookSecret } from "@/lib/env/stripe-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function chargeForRefundEvent(
  stripe: Stripe,
  eventType: string,
  object: Stripe.Event.Data.Object,
): Promise<{ charge: Stripe.Charge; refundStatus: string | null } | null> {
  if (eventType === "charge.refunded") {
    return { charge: object as Stripe.Charge, refundStatus: null };
  }
  const refund = object as Stripe.Refund;
  const chargeId = stripeId(refund.charge);
  if (!chargeId) return null;
  const charge = await stripe.charges.retrieve(chargeId);
  return { charge, refundStatus: refund.status ?? null };
}

async function markEventError(eventId: string, eventType: string, message: string): Promise<void> {
  try {
    await completeStripeWebhookEvent({ eventId, status: "error", error: message });
  } catch (recordError) {
    logStripe("webhook_error_record_failed", {
      eventId,
      eventType,
      message: recordError instanceof Error ? recordError.message : "Could not record error.",
    });
  }
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = getStripeWebhookSecret();
  if (!stripe || !webhookSecret) {
    logStripe("webhook_not_configured", {});
    return NextResponse.json(
      { error: "Stripe webhook is not configured.", code: "webhook_not_configured" },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    logStripe("webhook_bad_signature", {});
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const eventType = stripeEventType(event);
  const claim = await claimStripeWebhookEvent({ eventId: event.id, eventType });
  if (!claim.ok) {
    return NextResponse.json({ error: "Could not claim webhook event." }, { status: 500 });
  }
  if (claim.status === "duplicate") {
    return NextResponse.json({ ok: true, status: "duplicate", eventType });
  }
  if (claim.status === "busy") {
    return NextResponse.json({ error: "Webhook event is already processing." }, { status: 503 });
  }

  try {
    const object = event.data.object;
    let status: "processed" | "ignored" = isSupportedStripeEventType(eventType)
      ? "processed"
      : "ignored";
    let resultStatus = status;

    if (isPaidCheckoutEventType(eventType)) {
      const session = object as Stripe.Checkout.Session;
      const result = await fulfillPaidCheckoutSession({
        id: session.id,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
        currency: session.currency,
        client_reference_id: session.client_reference_id,
        livemode: session.livemode,
        payment_intent: session.payment_intent,
        customer: session.customer,
        metadata: (session.metadata ?? null) as Record<string, string> | null,
      });
      if (!result.ok) throw new Error(result.error);
      resultStatus = result.status === "ignored" ? "ignored" : "processed";
      status = resultStatus;
    } else if (isClosedCheckoutEventType(eventType)) {
      const session = object as Stripe.Checkout.Session;
      await markCheckoutSessionClosed(
        session.id,
        eventType === "checkout.session.expired" ? "expired" : "canceled",
      );
    } else if (isRefundEventType(eventType)) {
      const refund = await chargeForRefundEvent(stripe, eventType, object);
      if (!refund) {
        status = "ignored";
        resultStatus = "ignored";
      } else {
        const adjustment = await recordStripeChargeRefund({
          chargeId: refund.charge.id,
          paymentIntent: refund.charge.payment_intent,
          amount: refund.charge.amount,
          amountRefunded: refund.charge.amount_refunded,
          livemode: refund.charge.livemode,
          refundEventStatus: refund.refundStatus,
        });
        if (adjustment === "ignored") {
          status = "ignored";
          resultStatus = "ignored";
        }
      }
    } else if (isDisputeEventType(eventType)) {
      const dispute = object as Stripe.Dispute;
      const adjustment = await recordStripeDispute({
        disputeId: dispute.id,
        disputeStatus: dispute.status,
        charge: dispute.charge,
        paymentIntent: dispute.payment_intent,
        livemode: dispute.livemode,
      });
      if (adjustment === "ignored") {
        status = "ignored";
        resultStatus = "ignored";
      }
    }

    await completeStripeWebhookEvent({ eventId: event.id, status });
    return NextResponse.json({ ok: true, status: resultStatus, eventType });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed.";
    logStripe("webhook_process_failed", { eventType, message });
    await markEventError(event.id, eventType, message);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
