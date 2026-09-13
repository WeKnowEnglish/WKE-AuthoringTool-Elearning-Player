import { describe, expect, it } from "vitest";
import { refundStateForCharge } from "@/lib/billing/payment-adjustments";

describe("refund state", () => {
  it("distinguishes pending, partial, full, and failed refunds", () => {
    expect(refundStateForCharge({ amountRefunded: 0, orderTotal: 100, refundEventStatus: "pending" })).toBe("pending");
    expect(refundStateForCharge({ amountRefunded: 25, orderTotal: 100 })).toBe("partial");
    expect(refundStateForCharge({ amountRefunded: 100, orderTotal: 100 })).toBe("full");
    expect(refundStateForCharge({ amountRefunded: 0, orderTotal: 100, refundEventStatus: "failed" })).toBe("failed");
  });

  it("does not flag a charge with no refund activity", () => {
    expect(refundStateForCharge({ amountRefunded: 0, orderTotal: 100 })).toBe("none");
  });
});
