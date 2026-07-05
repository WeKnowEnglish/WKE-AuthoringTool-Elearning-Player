import type { z } from "zod";
import {
  createGrammarModuleSchema,
  type GrammarModule,
  type GrammarParseOptions,
} from "./schema";

export type GrammarModuleIssue = {
  path: string;
  message: string;
};

export class GrammarModuleParseError extends Error {
  readonly issues: GrammarModuleIssue[];

  constructor(message: string, issues: GrammarModuleIssue[]) {
    super(message);
    this.name = "GrammarModuleParseError";
    this.issues = issues;
  }
}

export function formatZodIssues(error: z.ZodError): GrammarModuleIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join(".") : "(root)",
    message: issue.message,
  }));
}

export function safeParseGrammarModule(
  data: unknown,
  options: GrammarParseOptions = {},
):
  | { success: true; data: GrammarModule }
  | { success: false; error: GrammarModuleParseError } {
  const schema = createGrammarModuleSchema(options);
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const issues = formatZodIssues(result.error);
  return {
    success: false,
    error: new GrammarModuleParseError("Invalid grammar module JSON", issues),
  };
}

export function parseGrammarModule(
  data: unknown,
  options: GrammarParseOptions = {},
): GrammarModule {
  const result = safeParseGrammarModule(data, options);
  if (!result.success) {
    throw result.error;
  }
  return result.data;
}
