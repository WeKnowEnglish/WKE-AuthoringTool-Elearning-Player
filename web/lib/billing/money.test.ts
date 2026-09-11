import { describe, expect, it } from "vitest";
import {
  formatStripeMoney,
  isValidLessonCount,
  isValidPackQuantity,
  majorToStripeAmount,
  parseMajorToStripeAmount,
  stripeAmountToMajor,
} from "@/lib/billing/money";

describe("lesson pack money", () => {
  it("only allows multiples of 8 lessons", () => {
    expect(isValidLessonCount(8)).toBe(true);
    expect(isValidLessonCount(16)).toBe(true);
    expect(isValidLessonCount(7)).toBe(false);
    expect(isValidLessonCount(0)).toBe(false);
  });

  it("caps pack quantity", () => {
    expect(isValidPackQuantity(1)).toBe(true);
    expect(isValidPackQuantity(6)).toBe(true);
    expect(isValidPackQuantity(7)).toBe(false);
  });

  it("converts USD cents and VND dong", () => {
    expect(majorToStripeAmount(200, "usd")).toBe(20000);
    expect(stripeAmountToMajor(20000, "usd")).toBe(200);
    expect(majorToStripeAmount(2_000_000, "vnd")).toBe(2_000_000);
    expect(stripeAmountToMajor(2_000_000, "vnd")).toBe(2_000_000);
  });

  it("parses admin price fields", () => {
    expect(parseMajorToStripeAmount("200.00", "usd")).toBe(20000);
    expect(parseMajorToStripeAmount("2,000,000", "vnd")).toBe(2_000_000);
    expect(parseMajorToStripeAmount("200.50", "vnd")).toBeNull();
    expect(parseMajorToStripeAmount("0", "usd")).toBeNull();
  });

  it("formats money for parents", () => {
    expect(formatStripeMoney(20000, "usd", "en-US")).toContain("200");
    expect(formatStripeMoney(2_000_000, "vnd", "vi-VN")).toMatch(/2/);
  });
});
