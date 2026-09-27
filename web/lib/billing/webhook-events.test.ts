import { describe, expect, it } from "vitest";
import {
  isDisputeEventType,
  isPaidCheckoutEventType,
  isRefundEventType,
  isSupportedStripeEventType,
  stripeEventType,
} from "@/lib/billing/webhook-events";

describe("stripe webhook event helpers", () => {
  it("reads event type from Stripe payloads", () => {
    expect(stripeEventType({ type: "checkout.session.completed" })).toBe(
      "checkout.session.completed",
    );
    expect(stripeEventType({})).toBe("");
  });

  it("treats paid checkout events as fulfillable", () => {
    expect(isPaidCheckoutEventType("checkout.session.completed")).toBe(true);
    expect(isPaidCheckoutEventType("checkout.session.async_payment_succeeded")).toBe(true);
    expect(isPaidCheckoutEventType("checkout.session.expired")).toBe(false);
  });

  it("classifies refund and dispute lifecycle events", () => {
    expect(isRefundEventType("refund.created")).toBe(true);
    expect(isRefundEventType("charge.refunded")).toBe(true);
    expect(isDisputeEventType("charge.dispute.created")).toBe(true);
    expect(isDisputeEventType("charge.dispute.closed")).toBe(true);
    expect(isSupportedStripeEventType("customer.created")).toBe(false);
  });
});
