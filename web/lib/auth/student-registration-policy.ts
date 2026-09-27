export type StudentRegistrationPolicyEnv = {
  nodeEnv?: string;
  publicSelfRegistrationEnabled?: string;
};

function parseBooleanFlag(value: string | undefined): boolean | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return false;
}

export function resolveStudentSelfRegistrationEnabled(
  env: StudentRegistrationPolicyEnv,
): boolean {
  const explicit = parseBooleanFlag(env.publicSelfRegistrationEnabled);
  if (explicit !== null) return explicit;
  return env.nodeEnv !== "production";
}

export function isStudentSelfRegistrationEnabled(): boolean {
  return resolveStudentSelfRegistrationEnabled({
    nodeEnv: process.env.NODE_ENV,
    publicSelfRegistrationEnabled:
      process.env.NEXT_PUBLIC_STUDENT_SELF_REGISTRATION_ENABLED,
  });
}

export const STUDENT_SELF_REGISTRATION_DISABLED_MESSAGE =
  "New student accounts are created with a teacher or parent. Ask them for your sign-in details.";
