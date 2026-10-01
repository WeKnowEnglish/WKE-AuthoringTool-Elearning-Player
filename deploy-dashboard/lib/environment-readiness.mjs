export const REQUIRED_PRODUCTION_ENVIRONMENT_KEYS = Object.freeze([
  "APP_ORIGIN",
  "CRON_SECRET",
  "NEXT_PUBLIC_APP_ORIGIN",
  "NEXT_PUBLIC_STUDENT_SELF_REGISTRATION_ENABLED",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_URL",
  "VIRTUAL_CLASSROOM_COOKIE_SECRET",
]);

export const FEATURE_ENVIRONMENT_KEYS = Object.freeze([
  "CLASSROOM_REALTIME_SUPABASE_AUTHORITY_PILOT",
  "CLASSROOM_REALTIME_SUPABASE_LIFECYCLE_AUTHORITY_PILOT",
  "CLASSROOM_REALTIME_SUPABASE_TOOL_AUTHORITY_PILOT",
  "COMMUNICATIONS_FROM_EMAIL",
  "COMMUNICATIONS_REPLY_TO",
  "DAILY_API_KEY",
  "DAILY_DOMAIN",
  "DAILY_ENABLED",
  "DAILY_WEBHOOK_HMAC",
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "LIVEBLOCKS_SECRET_KEY",
  "NEXT_PUBLIC_APP_DIAGNOSTICS_ENABLED",
  "NEXT_PUBLIC_CLASSROOM_REALTIME_ANNOUNCEMENT_PILOT",
  "NEXT_PUBLIC_CLASSROOM_REALTIME_LEARN_NAVIGATION_PILOT",
  "NEXT_PUBLIC_CLASSROOM_REALTIME_LEARN_PENS_PILOT",
  "NEXT_PUBLIC_CLASSROOM_REALTIME_LIFECYCLE_PILOT",
  "NEXT_PUBLIC_CLASSROOM_REALTIME_NATIVE_SHELL_PILOT",
  "NEXT_PUBLIC_CLASSROOM_REALTIME_PARTICIPANT_REGISTRY_PILOT",
  "NEXT_PUBLIC_CLASSROOM_REALTIME_PICKER_GROUPS_PILOT",
  "NEXT_PUBLIC_CLASSROOM_REALTIME_POINTS_PILOT",
  "NEXT_PUBLIC_CLASSROOM_REALTIME_PRESENCE_ROSTER_PILOT",
  "NEXT_PUBLIC_CLASSROOM_REALTIME_RANDOMISER_PILOT",
  "NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE",
  "NEXT_PUBLIC_CLASSROOM_REALTIME_STATUS_PILOT",
  "NEXT_PUBLIC_CLASSROOM_REALTIME_TIMER_PILOT",
  "NEXT_PUBLIC_DAILY_DOMAIN",
  "OPENAI_API_KEY",
  "RESEND_API_KEY",
  "RESOURCE_DOWNLOAD_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "TEACHER_ACCESS_FROM_EMAIL",
  "TEACHER_ACCESS_NOTIFICATION_EMAIL",
]);

function environmentKeySet(variables) {
  if (!Array.isArray(variables)) {
    throw new Error("Hostinger returned invalid environment metadata; production was left unchanged.");
  }

  return new Set(
    variables
      .map((variable) => (variable && typeof variable.key === "string" ? variable.key.trim() : ""))
      .filter(Boolean),
  );
}

export function analyzeProductionEnvironment({ previewVariables, productionVariables }) {
  const previewKeys = environmentKeySet(previewVariables);
  const productionKeys = environmentKeySet(productionVariables);
  const requiredKeys = [
    ...REQUIRED_PRODUCTION_ENVIRONMENT_KEYS,
    ...FEATURE_ENVIRONMENT_KEYS.filter((key) => previewKeys.has(key)),
  ];
  const missingKeys = [...new Set(requiredKeys)].filter((key) => !productionKeys.has(key));

  return {
    ready: missingKeys.length === 0,
    missingKeys,
  };
}

export function assertProductionEnvironmentReady(input) {
  const result = analyzeProductionEnvironment(input);
  if (!result.ready) {
    throw new Error(
      `Production environment preflight failed; missing ${result.missingKeys.join(", ")}. Production was left unchanged.`,
    );
  }
  return result;
}

export async function requireProductionEnvironmentReady({ hostinger, previewDomain, productionDomain }) {
  const [previewVariables, productionVariables] = await Promise.all([
    hostinger.listEnvironmentVariables(previewDomain),
    hostinger.listEnvironmentVariables(productionDomain),
  ]);

  return assertProductionEnvironmentReady({ previewVariables, productionVariables });
}
