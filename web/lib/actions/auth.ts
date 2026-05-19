"use server";

import { portalSignOut } from "@/lib/actions/portal-sign-out";

/** @deprecated Use {@link portalSignOut} — kept for existing imports. */
export async function teacherSignOut() {
  await portalSignOut();
}
