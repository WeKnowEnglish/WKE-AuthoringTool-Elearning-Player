import "server-only";

import { isAdmin, isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export type AdminContext = {
  userId: string;
  email: string | null;
  service: SupabaseClient;
};

export async function requireAdminContext(): Promise<
  { ok: true; ctx: AdminContext } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !isTeacher(user) || !isAdmin(user)) {
    return { ok: false, error: "Admin access required." };
  }
  const service = createServiceRoleSupabase();
  if (!service) {
    return { ok: false, error: "Admin tools are not configured (missing service role key)." };
  }
  return {
    ok: true,
    ctx: {
      userId: user.id,
      email: user.email ?? null,
      service,
    },
  };
}

/** Find an Auth user by email across pages (service role). */
export async function findAuthUserByEmail(
  service: SupabaseClient,
  email: string,
): Promise<User | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  for (let page = 1; page <= 20; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const users = data?.users ?? [];
    const match = users.find((u) => u.email?.toLowerCase() === normalized);
    if (match) return match;
    if (users.length < 200) break;
  }
  return null;
}

export async function listAuthUsersPaginated(
  service: SupabaseClient,
  opts?: { maxPages?: number; perPage?: number },
): Promise<User[]> {
  const maxPages = opts?.maxPages ?? 10;
  const perPage = opts?.perPage ?? 200;
  const all: User[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users ?? [];
    all.push(...users);
    if (users.length < perPage) break;
  }
  return all;
}
