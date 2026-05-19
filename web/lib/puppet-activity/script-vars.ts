/** Replace `{{food}}` style placeholders from presenter choice state. */
export function interpolatePuppetScriptText(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`);
}

export type PuppetScriptVars = Record<string, string>;

export const DEFAULT_CHOICE_VAR = "food";
