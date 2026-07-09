export const JOIN_CODE_LENGTH = 6;

/** Uppercase alphanumeric excluding 0/O, 1/I/L */
export const JOIN_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function normalizeJoinCode(input: string): string {
  return input.trim().toUpperCase();
}

export function isValidJoinCodeFormat(code: string): boolean {
  const normalized = normalizeJoinCode(code);
  if (normalized.length !== JOIN_CODE_LENGTH) return false;
  return [...normalized].every((char) => JOIN_CODE_ALPHABET.includes(char));
}

export function generateJoinCode(random = Math.random): string {
  let code = "";
  for (let i = 0; i < JOIN_CODE_LENGTH; i += 1) {
    const index = Math.floor(random() * JOIN_CODE_ALPHABET.length);
    code += JOIN_CODE_ALPHABET[index] ?? "2";
  }
  return code;
}

export function joinCodeValidationError(code: string): string | null {
  const normalized = normalizeJoinCode(code);
  if (!normalized) return "Enter your class code.";
  if (normalized.length !== JOIN_CODE_LENGTH) {
    return `Class codes are ${JOIN_CODE_LENGTH} characters.`;
  }
  if (!isValidJoinCodeFormat(normalized)) {
    return "That code has invalid characters.";
  }
  return null;
}
