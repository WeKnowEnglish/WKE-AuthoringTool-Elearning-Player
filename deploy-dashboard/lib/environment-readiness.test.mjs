import assert from "node:assert/strict";
import test from "node:test";

import {
  FEATURE_ENVIRONMENT_KEYS,
  REQUIRED_PRODUCTION_ENVIRONMENT_KEYS,
  analyzeProductionEnvironment,
  assertProductionEnvironmentReady,
} from "./environment-readiness.mjs";

function variables(keys, value = "********") {
  return keys.map((key) => ({ key, value }));
}

test("production environment preflight accepts the baseline and enabled preview features", () => {
  const previewFeatureKeys = [
    "CLASSROOM_REALTIME_SUPABASE_AUTHORITY_PILOT",
    "DAILY_API_KEY",
    "DAILY_DOMAIN",
    "DAILY_ENABLED",
    "LIVEBLOCKS_SECRET_KEY",
    "NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE",
    "NEXT_PUBLIC_DAILY_DOMAIN",
  ];
  const productionKeys = [...REQUIRED_PRODUCTION_ENVIRONMENT_KEYS, ...previewFeatureKeys];

  const result = analyzeProductionEnvironment({
    previewVariables: variables(previewFeatureKeys),
    productionVariables: variables(productionKeys),
  });

  assert.deepEqual(result, { ready: true, missingKeys: [] });
});

test("production environment preflight reports missing baseline and preview feature keys", () => {
  const previewFeatureKeys = ["DAILY_API_KEY", "LIVEBLOCKS_SECRET_KEY", "RESEND_API_KEY"];
  const productionKeys = REQUIRED_PRODUCTION_ENVIRONMENT_KEYS.filter((key) => key !== "CRON_SECRET");

  const result = analyzeProductionEnvironment({
    previewVariables: variables(previewFeatureKeys),
    productionVariables: variables(productionKeys),
  });

  assert.deepEqual(result, {
    ready: false,
    missingKeys: ["CRON_SECRET", "DAILY_API_KEY", "LIVEBLOCKS_SECRET_KEY", "RESEND_API_KEY"],
  });
  assert.equal(FEATURE_ENVIRONMENT_KEYS.includes("RESEND_API_KEY"), true);
});

test("production environment errors disclose key names but never secret values", () => {
  const secretValue = "preview-secret-must-not-leak";

  assert.throws(
    () =>
      assertProductionEnvironmentReady({
        previewVariables: variables(["DAILY_WEBHOOK_HMAC"], secretValue),
        productionVariables: variables(REQUIRED_PRODUCTION_ENVIRONMENT_KEYS),
      }),
    (error) => {
      assert.match(error.message, /DAILY_WEBHOOK_HMAC/);
      assert.doesNotMatch(error.message, new RegExp(secretValue));
      assert.match(error.message, /Production was left unchanged/);
      return true;
    },
  );
});
