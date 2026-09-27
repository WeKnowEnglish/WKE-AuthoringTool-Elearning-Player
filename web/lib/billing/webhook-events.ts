export function stripeEventType(event: { type?: unknown }): string {
  return typeof event.type === "string" ? event.type : "";
}

export function isPaidCheckoutEventType(eventType: string): boolean {
  return (
    eventType === "checkout.session.completed" ||
    eventType === "checkout.session.async_payment_succeeded"
  );
}

export function isClosedCheckoutEventType(eventType: string): boolean {
  return (
    eventType === "checkout.session.expired" ||
    eventType === "checkout.session.async_payment_failed"
  );
}

export function isRefundEventType(eventType: string): boolean {
  return (
    eventType === "refund.created" ||
    eventType === "refund.updated" ||
    eventType === "refund.failed" ||
    eventType === "charge.refunded"
  );
}

export function isDisputeEventType(eventType: string): boolean {
  return eventType === "charge.dispute.created" || eventType === "charge.dispute.closed";
}

export function isSupportedStripeEventType(eventType: string): boolean {
  return (
    isPaidCheckoutEventType(eventType) ||
    isClosedCheckoutEventType(eventType) ||
    isRefundEventType(eventType) ||
    isDisputeEventType(eventType)
  );
}
