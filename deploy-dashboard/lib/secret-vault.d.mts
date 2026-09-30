export type CredentialContext = {
  organizationId: string;
  projectId?: string | null;
  kind: string;
  label: string;
};
export function readSecretVaultConfig(environment?: NodeJS.ProcessEnv): {
  configured: boolean;
  missing: string[];
  config: { masterKey?: string; keyVersion: number };
};
export function encryptCredential(plaintext: string, options: {
  masterKey: string;
  keyVersion: number;
  context: CredentialContext;
}): string;
export function decryptCredential(envelope: string, options: {
  masterKeys: Record<number, string>;
  context: CredentialContext;
}): string;
