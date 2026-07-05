/** Uppercase shorthand labels (e.g. ANY) used for 30/70 poster columns. */
export function isLabelOnlyText(text: string): boolean {
  return text.length <= 4 && text === text.toUpperCase();
}
