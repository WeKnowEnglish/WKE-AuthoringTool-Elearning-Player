import { NextResponse } from "next/server";
import {
  claimStripeWebhookEvent,
  fulfillPaidCheckoutSession,
  markCheckoutSessionClosed,
} from "@/lib/billing/fulfill-checkout";
import { logStripe } from "@/lib/billing/log";
import { getStripe } from "@/lib/billing/stripe";
import {
  isClosedCheckoutEventType,
  isPaidCheckoutEventType,
  stripeEventType,
} from "@/lib/billing/webhook-events";
import { getStripeWebhookSecret } from "@/lib/env/stripe-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  let event: { id: string; type?: string; data?: { object?: unknown } };
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    logStripe("webhook_bad_signature", {});
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const eventType = stripeEventType(event);
  const object = event.data?.object as {
    id?: string;
    object?: string;
    payment_status?: string | null;
    payment_intent?: string | { id: string } | null;
    customer?: string | { id: string } | null;
    metadata?: Record<string, string> | null;
  } | null;

  if (!object?.id) {
    return NextResponse.json({ ok: true, status: "ignored" });
  }

  try {
    let status: string = "ignored";
    if (isPaidCheckoutEventType(eventType)) {
      const result = await fulfillPaidCheckoutSession({
        id: object.id,
        payment_status: object.payment_status,
        payment_intent: object.payment_intent,
        customer: object.customer,
        metadata: object.metadata,
      });
      if (!result.ok) {
        logStripe("webhook_fulfill_failed", { eventType, message: result.error });
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      status = result.status;
    } else if (isClosedCheckoutEventType(eventType)) {
      await markCheckoutSessionClosed(
        object.id,
        eventType === "checkout.session.expired" ? "expired" : "canceled",
      );
      status = "closed";
    }

    await claimStripeWebhookEvent({
      eventId: event.id,
      eventType,
    });
    return NextResponse.json({ ok: true, status, eventType });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed.";
    logStripe("webhook_process_failed", { eventType, message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
