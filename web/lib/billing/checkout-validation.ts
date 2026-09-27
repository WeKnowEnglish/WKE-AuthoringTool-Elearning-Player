export type CheckoutOrderForValidation = {
  id: string;
  guardian_user_id: string;
  student_id: string;
  package_id: string;
  quantity: number;
  lesson_count: number;
  unit_amount: number;
  currency: string;
  status: string;
  stripe_checkout_session_id: string | null;
  stripe_livemode: boolean | null;
};

export type CheckoutSessionForValidation = {
  id: string;
  payment_status?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  client_reference_id?: string | null;
  livemode?: boolean;
  metadata?: Record<string, string> | null;
};

export type CheckoutValidationResult =
  | { ok: true; expectedTotal: number }
  | { ok: false; error: string };

export function validatePaidCheckoutSession(
  session: CheckoutSessionForValidation,
  order: CheckoutOrderForValidation,
): CheckoutValidationResult {
  if (session.payment_status !== "paid") {
    return { ok: false, error: "Checkout session is not paid." };
  }

  if (order.status !== "pending" && order.status !== "paid") {
    return { ok: false, error: `Order cannot be paid from status ${order.status}.` };
  }

  if (!order.stripe_checkout_session_id || order.stripe_checkout_session_id !== session.id) {
    return { ok: false, error: "Checkout session does not match the order." };
  }

  if (
    typeof session.livemode !== "boolean" ||
    typeof order.stripe_livemode !== "boolean" ||
    session.livemode !== order.stripe_livemode
  ) {
    return { ok: false, error: "Checkout mode does not match the order." };
  }

  const expectedTotal = order.unit_amount * order.quantity;
  if (!Number.isSafeInteger(expectedTotal) || expectedTotal <= 0) {
    return { ok: false, error: "Order total is invalid." };
  }
  if (session.amount_total !== expectedTotal) {
    return { ok: false, error: "Checkout amount does not match the order." };
  }
  if ((session.currency ?? "").toLowerCase() !== order.currency.toLowerCase()) {
    return { ok: false, error: "Checkout currency does not match the order." };
  }
  if (session.client_reference_id !== order.id) {
    return { ok: false, error: "Checkout reference does not match the order." };
  }

  const metadata = session.metadata ?? {};
  const expectedMetadata: Record<string, string> = {
    order_id: order.id,
    guardian_user_id: order.guardian_user_id,
    student_id: order.student_id,
    package_id: order.package_id,
    quantity: String(order.quantity),
    lesson_count: String(order.lesson_count),
  };
  for (const [key, expected] of Object.entries(expectedMetadata)) {
    if (metadata[key] !== expected) {
      return { ok: false, error: `Checkout metadata ${key} does not match the order.` };
    }
  }

  return { ok: true, expectedTotal };
}
