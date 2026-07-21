/**
 * One-off: set app_metadata.admin = true on the developer teacher account.
 * Usage: node scripts/grant-admin.mjs [email]
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envLocal = path.join(__dirname, "..", ".env.local");
dotenv.config({ path: envLocal });

if (existsSync(envLocal)) {
  const text = readFileSync(envLocal, "utf8");
  const m = text.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m);
  if (m?.[1]) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = m[1].trim().replace(/^["']|["']$/g, "");
  }
}

const url =
  process.env.SUPABASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
  "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
const email = (process.argv[2] || "bradydmyers@gmail.com").trim().toLowerCase();

if (!url || !key) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY or URL in .env.local");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let found = null;
let page = 1;
while (!found && page <= 20) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  found = data.users.find((u) => (u.email || "").toLowerCase() === email) ?? null;
  if ((data.users?.length ?? 0) < 200) break;
  page += 1;
}

if (!found) {
  console.error("User not found:", email);
  process.exit(1);
}

const { data: updated, error: upErr } = await admin.auth.admin.updateUserById(found.id, {
  app_metadata: {
    ...found.app_metadata,
    role: "teacher",
    admin: true,
  },
});

if (upErr) {
  console.error(upErr.message);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      id: updated.user?.id,
      email: updated.user?.email,
      app_metadata: updated.user?.app_metadata,
    },
    null,
    2,
  ),
);
