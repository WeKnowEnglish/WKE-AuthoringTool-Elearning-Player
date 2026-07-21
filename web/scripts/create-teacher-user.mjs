/**
 * Create or update a Supabase Auth user with app_metadata.role = "teacher".
 *
 * Requires in .env.local:
 *   SUPABASE_SERVICE_ROLE_KEY  (Dashboard → Settings → API → service_role — never expose publicly)
 *   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
 *
 * Usage:
 *   node scripts/create-teacher-user.mjs <email> <password> [--tier light|plus] [--must-change-password|--no-must-change-password]
 *
 * npm:
 *   npm run create-teacher -- you@example.com YourPassword --tier light
 *
 * Metadata:
 *   role: "teacher"              — portal + RLS access (same for light and plus)
 *   teacher_tier: "light"|"plus" — product tier (default: plus)
 *   must_change_password: bool   — first-login induction (default: true)
 *   admin: false                 — never granted by this script
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
  const m = text.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m);
  if (m?.[1]) {
    const v = m[1].trim().replace(/^["']|["']$/g, "");
    if (v && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      process.env.SUPABASE_SERVICE_ROLE_KEY = v;
    }
  }
}

function printUsage() {
  console.error(
    "Usage: node scripts/create-teacher-user.mjs <email> <password> [--tier light|plus] [--must-change-password|--no-must-change-password]",
  );
  console.error(
    '   or: npm run create-teacher -- you@example.com "YourPassword" --tier light',
  );
}

function parseArgs(argv) {
  const positional = [];
  let tier = "plus";
  let mustChangePassword = true;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--tier") {
      const value = argv[++i]?.trim().toLowerCase();
      if (value !== "light" && value !== "plus") {
        console.error(`Invalid --tier "${value ?? ""}". Use light or plus.`);
        printUsage();
        process.exit(1);
      }
      tier = value;
      continue;
    }
    if (arg === "--must-change-password") {
      mustChangePassword = true;
      continue;
    }
    if (arg === "--no-must-change-password") {
      mustChangePassword = false;
      continue;
    }
    if (arg.startsWith("-")) {
      console.error(`Unknown flag: ${arg}`);
      printUsage();
      process.exit(1);
    }
    positional.push(arg);
  }

  return {
    email: positional[0]?.trim() || "",
    password: positional[1] ?? "",
    tier,
    mustChangePassword,
  };
}

dotenv.config({ path: envLocal });
dotenv.config({ path: envDefault });
loadServiceRoleFromFile(envLocal);

const url =
  process.env.SUPABASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
  "";
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
const { email, password, tier, mustChangePassword } = parseArgs(process.argv.slice(2));

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
  printUsage();
  process.exit(1);
}

function buildTeacherAppMetadata(existing = {}) {
  return {
    ...existing,
    role: "teacher",
    // create-teacher never grants admin; preserve only if already true.
    admin: existing.admin === true,
    teacher_tier: tier,
    must_change_password: mustChangePassword,
  };
}

const admin = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const appMetadata = buildTeacherAppMetadata();

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  app_metadata: appMetadata,
});

if (error) {
  const msg = error.message || String(error);
  if (/already|exists|registered/i.test(msg)) {
    console.log("User already exists. Looking up id to update teacher metadata + password…");
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
    const { data: updated, error: upErr } = await admin.auth.admin.updateUserById(u.id, {
      password,
      email_confirm: true,
      app_metadata: buildTeacherAppMetadata(u.app_metadata ?? {}),
    });
    if (upErr) {
      console.error(upErr);
      process.exit(1);
    }
    console.log("OK — updated", email);
    console.log("  role: teacher");
    console.log("  teacher_tier:", updated.user?.app_metadata?.teacher_tier ?? tier);
    console.log(
      "  must_change_password:",
      updated.user?.app_metadata?.must_change_password ?? mustChangePassword,
    );
    console.log("  password: reset to the value you passed");
    process.exit(0);
  }
  console.error("Create user failed:", msg);
  process.exit(1);
}

console.log("OK — created teacher:", data.user?.email);
console.log("  teacher_tier:", data.user?.app_metadata?.teacher_tier ?? tier);
console.log(
  "  must_change_password:",
  data.user?.app_metadata?.must_change_password ?? mustChangePassword,
);
console.log("Sign in at /login?portal=teacher");
