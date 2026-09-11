import { describe, expect, it } from "vitest";
import { isPaidCheckoutEventType, stripeEventType } from "@/lib/billing/webhook-events";

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
});
