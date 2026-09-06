"use server";

import { headers } from "next/headers";
import { fulfillPaidCheckoutSession } from "@/lib/billing/fulfill-checkout";
import { isStripeConfigured } from "@/lib/env/stripe-server";
import { requestOriginFromHeaders } from "@/lib/billing/log";
import { logStripe } from "@/lib/billing/log";
import { isValidPackQuantity } from "@/lib/billing/money";
import { getStripe } from "@/lib/billing/stripe";
import { listParentLinkedStudents } from "@/lib/parent/guardian-data";
import { rateLimitAllow } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";

type Result = { ok: true; url: string } | { ok: false; error: string };

export async function startParentLessonCheckout(input: {
  packageId: string;
  studentId: string;
  quantity: number;
}): Promise<Result> {
  const packageId = input.packageId.trim();
  const studentId = input.studentId.trim();
  const quantity = Number(input.quantity);
  if (!packageId || !studentId) {
    return { ok: false, error: "Choose a child and a lesson pack." };
  }
  if (!isValidPackQuantity(quantity)) {
    return { ok: false, error: "Choose between 1 and 6 packs." };
  }

  const stripe = getStripe();
  if (!stripe || !isStripeConfigured()) {
    return { ok: false, error: "Checkout is not available yet. Please try again later." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return { ok: false, error: "Sign in again to continue." };

  const allowed = await rateLimitAllow(`parent-checkout:${user.id}`, 8, 10 * 60 * 1000);
  if (!allowed) {
    return { ok: false, error: "Too many checkout attempts. Please wait a few minutes." };
  }

  const students = await listParentLinkedStudents();
  const student = students.find((item) => item.studentId === studentId);
  if (!student) {
    return { ok: false, error: "That child is not linked to this parent account." };
  }

  const service = createServiceRoleSupabase();
  if (!service) return { ok: false, error: "Checkout is not available yet. Please try again later." };

  const { data: pack, error: packError } = await service
    .from("lesson_packages")
    .select("id, name, description, lesson_count, unit_amount, currency, is_active")
    .eq("id", packageId)
    .eq("is_active", true)
    .maybeSingle();
  if (packError || !pack) {
    return { ok: false, error: "That lesson pack is no longer available." };
  }

  const lessonCount = Number(pack.lesson_count) * quantity;
  const unitAmount = Number(pack.unit_amount);
  const currency = String(pack.currency);
  const now = new Date().toISOString();

  const { data: order, error: orderError } = await service
    .from("lesson_pack_orders")
    .insert({
      guardian_user_id: user.id,
      student_id: studentId,
      package_id: pack.id,
      quantity,
      lesson_count: lessonCount,
      unit_amount: unitAmount,
      currency,
      status: "pending",
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();
  if (orderError || !order) {
    logStripe("order_insert_failed", { message: orderError?.message ?? "missing order" });
    return { ok: false, error: "We could not start checkout. Please try again." };
  }

  const { data: profile } = await service
    .from("parent_profiles")
    .select("stripe_customer_id, preferred_language")
    .eq("user_id", user.id)
    .maybeSingle();

  const origin = requestOriginFromHeaders(await headers());
  const locale = profile?.preferred_language === "vi" ? "vi" : "en";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: profile?.stripe_customer_id || undefined,
      customer_email: profile?.stripe_customer_id ? undefined : user.email || undefined,
      client_reference_id: String(order.id),
      locale,
      line_items: [
        {
          quantity,
          price_data: {
            currency,
            unit_amount: unitAmount,
            product_data: {
              name: String(pack.name),
              description:
                String(pack.description || "").trim() ||
                `${Number(pack.lesson_count)} lessons for ${student.displayName}`,
            },
          },
        },
      ],
      metadata: {
        order_id: String(order.id),
        guardian_user_id: user.id,
        student_id: studentId,
        package_id: String(pack.id),
        quantity: String(quantity),
        lesson_count: String(lessonCount),
      },
      success_url: `${origin}/parent/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/parent/checkout?canceled=1`,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    await service
      .from("lesson_pack_orders")
      .update({
        stripe_checkout_session_id: session.id,
        stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    return { ok: true, url: session.url };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe checkout failed.";
    logStripe("checkout_session_failed", { orderId: String(order.id), message });
    await service
      .from("lesson_pack_orders")
      .update({ status: "canceled", updated_at: new Date().toISOString() })
      .eq("id", order.id)
      .eq("status", "pending");
    return { ok: false, error: "We could not start checkout. Please try again." };
  }
}

export async function confirmParentLessonCheckout(
  sessionId: string,
): Promise<{ ok: true; status: "paid" | "pending" } | { ok: false; error: string }> {
  const id = sessionId.trim();
  if (!id.startsWith("cs_")) {
    return { ok: false, error: "Missing checkout session." };
  }

  const stripe = getStripe();
  if (!stripe) return { ok: false, error: "Checkout is not available yet." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return { ok: false, error: "Sign in again to continue." };

  try {
    const session = await stripe.checkout.sessions.retrieve(id);
    if (session.metadata?.guardian_user_id && session.metadata.guardian_user_id !== user.id) {
      return { ok: false, error: "This payment does not belong to this account." };
    }
    if (session.payment_status === "paid") {
      const result = await fulfillPaidCheckoutSession({
        id: session.id,
        payment_status: session.payment_status,
        payment_intent: session.payment_intent,
        customer: session.customer,
        metadata: (session.metadata ?? null) as Record<string, string> | null,
      });
      if (!result.ok) return { ok: false, error: result.error };
      return { ok: true, status: "paid" };
    }
    return { ok: true, status: "pending" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not confirm payment.";
    logStripe("confirm_session_failed", { message });
    return { ok: false, error: "We could not confirm this payment yet. Please refresh." };
  }
}

