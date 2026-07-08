/** Uppercase alphanumeric without ambiguous O/0, I/1. */
const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const JOIN_CODE_LENGTH = 6;

export function generateJoinCode(random: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < JOIN_CODE_LENGTH; i += 1) {
    const index = Math.floor(random() * JOIN_CODE_ALPHABET.length);
    code += JOIN_CODE_ALPHABET[index]!;
  }
  return code;
}

export function isValidJoinCode(code: string): boolean {
  if (code.length !== JOIN_CODE_LENGTH) return false;
  return [...code].every((char) => JOIN_CODE_ALPHABET.includes(char));
}
