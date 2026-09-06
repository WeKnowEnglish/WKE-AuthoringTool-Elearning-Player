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
