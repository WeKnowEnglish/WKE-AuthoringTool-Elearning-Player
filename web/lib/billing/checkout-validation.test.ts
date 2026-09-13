import { describe, expect, it } from "vitest";
import {
  validatePaidCheckoutSession,
  type CheckoutOrderForValidation,
  type CheckoutSessionForValidation,
} from "@/lib/billing/checkout-validation";

const order: CheckoutOrderForValidation = {
  id: "order-1",
  guardian_user_id: "guardian-1",
  student_id: "student-1",
  package_id: "package-1",
  quantity: 2,
  lesson_count: 16,
  unit_amount: 1_600_000,
  currency: "vnd",
  status: "pending",
  stripe_checkout_session_id: "cs_live_1",
  stripe_livemode: true,
};

const session: CheckoutSessionForValidation = {
  id: "cs_live_1",
  payment_status: "paid",
  amount_total: 3_200_000,
  currency: "vnd",
  client_reference_id: "order-1",
  livemode: true,
  metadata: {
    order_id: "order-1",
    guardian_user_id: "guardian-1",
    student_id: "student-1",
    package_id: "package-1",
    quantity: "2",
    lesson_count: "16",
  },
};

describe("paid checkout validation", () => {
  it("accepts an exact paid order match", () => {
    expect(validatePaidCheckoutSession(session, order)).toEqual({
      ok: true,
      expectedTotal: 3_200_000,
    });
  });

  it.each([
    ["amount", { amount_total: 3_199_999 }],
    ["currency", { currency: "usd" }],
    ["reference", { client_reference_id: "another-order" }],
    ["mode", { livemode: false }],
    ["session", { id: "cs_live_other" }],
  ])("rejects a mismatched %s", (_label, change) => {
    expect(validatePaidCheckoutSession({ ...session, ...change }, order).ok).toBe(false);
  });

  it("rejects missing or altered ownership metadata", () => {
    expect(
      validatePaidCheckoutSession(
        { ...session, metadata: { ...session.metadata, guardian_user_id: "guardian-2" } },
        order,
      ),
    ).toEqual({ ok: false, error: "Checkout metadata guardian_user_id does not match the order." });
  });

  it("allows an already-paid order so retries remain idempotent", () => {
    expect(validatePaidCheckoutSession(session, { ...order, status: "paid" }).ok).toBe(true);
  });

  it("rejects closed orders", () => {
    expect(validatePaidCheckoutSession(session, { ...order, status: "refunded" }).ok).toBe(false);
  });
});
