import type { GrammarModule } from "../schema";

export function formatGrammarModuleJson(module: GrammarModule): string {
  return `${JSON.stringify(module, null, 2)}\n`;
}

export function downloadGrammarModuleJson(fileName: string, module: GrammarModule): void {
  const blob = new Blob([formatGrammarModuleJson(module)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName.endsWith(".json") ? fileName : `${fileName}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function copyGrammarModuleJson(module: GrammarModule): Promise<void> {
  await navigator.clipboard.writeText(formatGrammarModuleJson(module));
}
