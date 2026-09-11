"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/lib/admin/admin-context";
import {
  isValidLessonCount,
  normalizeCurrency,
  parseMajorToStripeAmount,
} from "@/lib/billing/money";

type Result = { ok: true; message: string } | { ok: false; error: string };

function readPackageInput(input: {
  name: string;
  description: string;
  lessonCount: number;
  priceMajor: string;
  currency: string;
  isActive: boolean;
  sortOrder: number;
}):
  | {
      ok: true;
      value: {
        name: string;
        description: string;
        lessonCount: number;
        unitAmount: number;
        currency: string;
        isActive: boolean;
        sortOrder: number;
      };
    }
  | { ok: false; error: string } {
  const name = input.name.trim().slice(0, 80);
  const description = input.description.trim().slice(0, 500);
  if (name.length < 2) return { ok: false, error: "Enter a package name." };
  if (!isValidLessonCount(input.lessonCount)) {
    return { ok: false, error: "Lesson count must be 8, 16, 24, or another multiple of 8." };
  }
  const currency = normalizeCurrency(input.currency);
  if (!currency) return { ok: false, error: "Choose VND or USD." };
  const unitAmount = parseMajorToStripeAmount(input.priceMajor, currency);
  if (!unitAmount) {
    return {
      ok: false,
      error: currency === "vnd" ? "Enter a whole-dong price." : "Enter a price greater than 0.",
    };
  }
  const sortOrder = Number.isFinite(input.sortOrder) ? Math.round(input.sortOrder) : 0;
  return {
    ok: true,
    value: {
      name,
      description,
      lessonCount: input.lessonCount,
      unitAmount,
      currency,
      isActive: input.isActive !== false,
      sortOrder,
    },
  };
}

export async function adminCreateLessonPackage(input: {
  name: string;
  description: string;
  lessonCount: number;
  priceMajor: string;
  currency: string;
  isActive: boolean;
  sortOrder: number;
}): Promise<Result> {
  const gate = await requireAdminContext();
  if (!gate.ok) return { ok: false, error: gate.error };
  const parsed = readPackageInput(input);
  if (!parsed.ok) return parsed;

  const now = new Date().toISOString();
  const { error } = await gate.ctx.service.from("lesson_packages").insert({
    name: parsed.value.name,
    description: parsed.value.description,
    lesson_count: parsed.value.lessonCount,
    unit_amount: parsed.value.unitAmount,
    currency: parsed.value.currency,
    is_active: parsed.value.isActive,
    sort_order: parsed.value.sortOrder,
    created_at: now,
    updated_at: now,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/teacher/admin/packages");
  revalidatePath("/parent/checkout");
  return { ok: true, message: "Package created." };
}

export async function adminUpdateLessonPackage(input: {
  id: string;
  name: string;
  description: string;
  lessonCount: number;
  priceMajor: string;
  currency: string;
  isActive: boolean;
  sortOrder: number;
}): Promise<Result> {
  const gate = await requireAdminContext();
  if (!gate.ok) return { ok: false, error: gate.error };
  const id = input.id.trim();
  if (!id) return { ok: false, error: "Package not found." };
  const parsed = readPackageInput(input);
  if (!parsed.ok) return parsed;

  const { error } = await gate.ctx.service
    .from("lesson_packages")
    .update({
      name: parsed.value.name,
      description: parsed.value.description,
      lesson_count: parsed.value.lessonCount,
      unit_amount: parsed.value.unitAmount,
      currency: parsed.value.currency,
      is_active: parsed.value.isActive,
      sort_order: parsed.value.sortOrder,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/teacher/admin/packages");
  revalidatePath("/parent/checkout");
  return { ok: true, message: "Package saved." };
}
