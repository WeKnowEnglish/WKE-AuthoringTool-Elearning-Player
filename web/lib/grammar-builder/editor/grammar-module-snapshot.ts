import type { GrammarModule } from "../schema";

export function grammarModuleSnapshot(module: GrammarModule): string {
  return JSON.stringify(module);
}

export function isGrammarModuleDirty(
  module: GrammarModule,
  savedSnapshot: string | null,
): boolean {
  if (savedSnapshot === null) {
    return false;
  }
  return grammarModuleSnapshot(module) !== savedSnapshot;
}
