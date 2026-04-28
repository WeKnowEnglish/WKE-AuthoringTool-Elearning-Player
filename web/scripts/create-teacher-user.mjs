/**
 * One-off: create a Supabase Auth user with app_metadata.role = "teacher".
 *
 * Requires in .env.local:
 *   SUPABASE_SERVICE_ROLE_KEY  (Dashboard → Settings → API → service_role — never expose publicly)
 *   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
 *
 * Usage:
 *   node scripts/create-teacher-user.mjs <email> <password>
 *
 * npm:
 *   npm run create-teacher -- you@example.com YourPassword
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envLocal = path.join(__dirname, "..", ".env.local");
const envDefault = path.join(__dirname, "..", ".env");

/** dotenv can miss very long lines on some systems; pull service role explicitly. */
function loadServiceRoleFromFile(filePath) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  const m = text.match(
    /^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m,
  );
  if (m?.[1]) {
    const v = m[1].trim().replace(/^["']|["']$/g, "");
    if (v && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      process.env.SUPABASE_SERVICE_ROLE_KEY = v;
    }
  }
}

dotenv.config({ path: envLocal });
dotenv.config({ path: envDefault });
loadServiceRoleFromFile(envLocal);

const url =
  process.env.SUPABASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
  "";
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
const email = process.argv[2]?.trim();
const password = process.argv[3] ?? "";

if (!url || !serviceRole) {
  console.error(
    "Missing SUPABASE_SERVICE_ROLE_KEY or URL.\n" +
      "Add SUPABASE_SERVICE_ROLE_KEY from Supabase → Project Settings → API (service_role) to:\n" +
      `  ${envLocal}\n` +
      "\nIf you already added it in the editor, save the file (Ctrl+S) — unsaved changes are not read.\n" +
      `File exists on disk: ${existsSync(envLocal)}`,
  );
  process.exit(1);
}

if (!email || !password) {
  console.error("Usage: node scripts/create-teacher-user.mjs <email> <password>");
  console.error('   or: npm run create-teacher -- you@example.com "YourPassword"');
  process.exit(1);
}

const admin = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  app_metadata: { role: "teacher" },
});

if (error) {
  const msg = error.message || String(error);
  if (/already|exists|registered/i.test(msg)) {
    console.log("User already exists. Looking up id to set teacher role…");
    const { data: page, error: listErr } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) {
      console.error(listErr);
      process.exit(1);
    }
    const u = page?.users?.find((x) => x.email?.toLowerCase() === email.toLowerCase());
    if (!u) {
      console.error("Could not find user by email. Set role manually in Dashboard:", msg);
      process.exit(1);
    }
    const { error: upErr } = await admin.auth.admin.updateUserById(u.id, {
      app_metadata: { ...u.app_metadata, role: "teacher" },
    });
    if (upErr) {
      console.error(upErr);
      process.exit(1);
    }
    console.log("OK — updated", email, "with app_metadata.role = teacher");
    process.exit(0);
  }
  console.error("Create user failed:", msg);
  process.exit(1);
}

console.log("OK — created teacher:", data.user?.email);
console.log("Sign in at /teacher/login");
