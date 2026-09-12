import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", override: false });

const required = [
  "WKE_001_FIXTURE_CONFIRMATION",
  "WKE_001_EXPECTED_SUPABASE_PROJECT_REF",
  "WKE_001_PRIMARY_USERNAME",
  "WKE_001_PRIMARY_PIN",
  "WKE_001_SECONDARY_USERNAME",
  "WKE_001_SECONDARY_PIN",
  "WKE_001_TEACHER_EMAIL",
  "WKE_001_TEACHER_PASSWORD",
  "WKE_001_UNTARGETED_USERNAME",
  "WKE_001_UNTARGETED_PIN",
  "WKE_001_UNENROLLED_USERNAME",
  "WKE_001_UNENROLLED_PIN",
  "WKE_001_PRIMARY_CLASS_ID",
  "WKE_001_SECONDARY_CLASS_ID",
  "WKE_001_SECONDARY_DISPLAY_NAME",
  "WKE_001_PRIMARY_WRITING_DESKTOP_ID",
  "WKE_001_PRIMARY_WRITING_MOBILE_ID",
  "WKE_001_PRIMARY_WRITING_RECOVERY_ID",
  "WKE_001_PRIMARY_GRADED_DESKTOP_ID",
  "WKE_001_PRIMARY_GRADED_MOBILE_ID",
  "WKE_001_SECONDARY_TEMPLATE_DESKTOP_ID",
  "WKE_001_SECONDARY_TEMPLATE_MOBILE_ID",
  "WKE_001_SECONDARY_GRADED_DESKTOP_ID",
  "WKE_001_SECONDARY_GRADED_MOBILE_ID",
];

if (process.env.WKE_001_EDGE === "true") {
  required.push("WKE_001_PRIMARY_WRITING_EDGE_ID");
  required.push("WKE_001_PRIMARY_GRADED_EDGE_ID");
  required.push("WKE_001_SECONDARY_TEMPLATE_EDGE_ID");
  required.push("WKE_001_SECONDARY_GRADED_EDGE_ID");
}

const missing = required.filter((name) => !process.env[name]?.trim());

if (missing.length > 0) {
  console.error("WKE-001 live acceptance cannot start. Add these names to .env.local:");
  for (const name of missing) console.error(`- ${name}`);
  process.exit(1);
}

const placeholders = required.filter((name) => {
  const value = process.env[name]?.trim() ?? "";
  return /^<[^>]+>$/.test(value) || /^(?:replace[-_ ]?me|todo|tbd)$/i.test(value);
});

if (placeholders.length > 0) {
  console.error(
    "WKE-001 live acceptance cannot start. Replace these example placeholders in .env.local:",
  );
  for (const name of placeholders) console.error(`- ${name}`);
  process.exit(1);
}

const invalidStudentCredentials = required.filter((name) => {
  const value = process.env[name]?.trim() ?? "";
  if (name.endsWith("_USERNAME")) return !/^[a-z0-9_]{3,20}$/.test(value);
  if (name.endsWith("_PIN")) return !/^\d{4,6}$/.test(value);
  return false;
});

if (invalidStudentCredentials.length > 0) {
  console.error(
    "WKE-001 live acceptance cannot start. Correct the format of these student credential fields:",
  );
  for (const name of invalidStudentCredentials) console.error(`- ${name}`);
  process.exit(1);
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const invalidIds = required.filter(
  (name) => name.endsWith("_ID") && !uuidPattern.test(process.env[name]?.trim() ?? ""),
);

if (invalidIds.length > 0) {
  console.error(
    "WKE-001 live acceptance cannot start. Replace these fields with class_homework or teacher_classes UUIDs:",
  );
  for (const name of invalidIds) console.error(`- ${name}`);
  process.exit(1);
}

if (process.env.WKE_001_FIXTURE_CONFIRMATION !== "purpose-created-non-production") {
  console.error(
    "WKE-001 live acceptance refused: WKE_001_FIXTURE_CONFIRMATION must equal purpose-created-non-production.",
  );
  process.exit(1);
}

const expectedProjectRef = process.env.WKE_001_EXPECTED_SUPABASE_PROJECT_REF;
if (!/^[a-z0-9]{20}$/.test(expectedProjectRef)) {
  console.error(
    "WKE-001 live acceptance refused: WKE_001_EXPECTED_SUPABASE_PROJECT_REF must be a 20-character project ref.",
  );
  process.exit(1);
}

const externalBaseURL = process.env.WKE_001_BASE_URL?.trim();
if (externalBaseURL) {
  let hostname;
  try {
    hostname = new URL(externalBaseURL).hostname.toLowerCase();
  } catch {
    console.error("WKE-001 live acceptance refused: WKE_001_BASE_URL is not a valid URL.");
    process.exit(1);
  }
  if (hostname === "weknowenglish.online" || hostname === "www.weknowenglish.online") {
    console.error("WKE-001 live acceptance refused: the production site is never an allowed target.");
    process.exit(1);
  }
} else {
  const configuredURL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  let configuredProjectRef = "";
  try {
    configuredProjectRef = new URL(configuredURL).hostname.split(".")[0] ?? "";
  } catch {
    console.error("WKE-001 live acceptance refused: the configured Supabase URL is invalid.");
    process.exit(1);
  }
  if (configuredProjectRef !== expectedProjectRef) {
    console.error(
      "WKE-001 live acceptance refused: the configured Supabase project does not match the expected test project ref.",
    );
    process.exit(1);
  }
}

console.log(
  `WKE-001 live acceptance preflight passed (${required.length} required values present; values not printed).`,
);
