import {
  STUDENT_FACING_STATIC_COPY,
  STUDENT_FACING_STATIC_COPY_AUDIT_SOURCES,
  STUDENT_FACING_STATIC_COPY_IGNORED_LITERALS,
  type StudentFacingStaticCopyAuditSource,
  type StudentFacingStaticCopyEntry,
  type StudentFacingStaticCopyIgnoredLiteral,
} from "@/lib/student-facing-static-copy";

export type StaticCopySourceText = {
  source: string;
  text: string;
};

export type StaticCopyLiteralCandidate = {
  source: string;
  line: number;
  text: string;
};

export type StaticCopyAuditResult = {
  auditedSourceCount: number;
  candidateCount: number;
  unregisteredCount: number;
  candidates: StaticCopyLiteralCandidate[];
  unregistered: StaticCopyLiteralCandidate[];
};

const STUDENT_COPY_WORDS = [
  "all",
  "again",
  "back",
  "catch",
  "choose",
  "claim",
  "collect",
  "complete",
  "correct",
  "done",
  "finish",
  "gold",
  "great",
  "hint",
  "learn",
  "listen",
  "next",
  "open",
  "play",
  "practice",
  "quest",
  "read",
  "reward",
  "say",
  "spell",
  "start",
  "tap",
  "try",
  "unlock",
  "word",
  "write",
  "wrong",
  "xp",
];

const NON_STUDENT_COPY_PATTERNS = [
  /^#[0-9a-f]{3,8}$/i,
  /^[a-z0-9_-]+$/i,
  /^(?:http|https|data):/i,
  /^@?\//,
  /^@?[\w.-]+(?:\/[\w.-]+)+$/,
  /^\.\.?(?:\/[\w.-]+)+$/,
  /^(?:components|lib|app|public|\/)/,
  /(?:className|font-|text-|bg-|border-|shadow-|rounded|grid|flex)/,
  /^(?:button|submit|reset|checkbox|radio|text|number|email|password)$/i,
  /^(?:use client|use server)$/i,
];

function lineNumberAt(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (text.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function decodeQuotedLiteral(raw: string): string {
  const quote = raw[0];
  const inner = raw.slice(1, -1);
  if (quote === "`" && /\$\{/.test(inner)) return "";
  return inner
    .replace(/\\n/g, " ")
    .replace(/\\t/g, " ")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/`/g, "`")
    .replace(/\s+/g, " ")
    .trim();
}

function looksStudentFacing(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 4 || trimmed.length > 180) return false;
  if (NON_STUDENT_COPY_PATTERNS.some((pattern) => pattern.test(trimmed))) return false;
  if (!/[A-Za-z]/.test(trimmed)) return false;

  const lower = trimmed.toLowerCase();
  if (STUDENT_COPY_WORDS.some((word) => lower.includes(word))) return true;
  if (/[.!?]$/.test(trimmed) && /\s/.test(trimmed)) return true;
  return /^[A-Z][A-Za-z0-9 ,.'!?&()+:%/-]+$/.test(trimmed) && /\s/.test(trimmed);
}

export function extractStaticCopyLiteralCandidates(
  source: StaticCopySourceText,
): StaticCopyLiteralCandidate[] {
  const candidates: StaticCopyLiteralCandidate[] = [];
  const literalRe = /(["'`])(?:\\.|(?!\1)[\s\S])*?\1/g;
  for (const match of source.text.matchAll(literalRe)) {
    const raw = match[0];
    const text = decodeQuotedLiteral(raw);
    if (!text || !looksStudentFacing(text)) continue;
    candidates.push({
      source: source.source,
      line: lineNumberAt(source.text, match.index ?? 0),
      text,
    });
  }
  return candidates;
}

function sourceMatchesAuditSource(
  source: string,
  audited: StudentFacingStaticCopyAuditSource,
): boolean {
  return audited.source.endsWith("/interactions") || audited.source.endsWith("\\interactions") ?
      source.includes("components/lesson/interactions") ||
        source.includes("components\\lesson\\interactions")
    : source === audited.source;
}

function normalizeCopyText(text: string): string {
  return text.trim().replace(/…/g, "...").replace(/\s+/g, " ").toLowerCase();
}

export function auditStudentFacingStaticCopySources(input: {
  sources: readonly StaticCopySourceText[];
  registered?: readonly StudentFacingStaticCopyEntry[];
  auditedSources?: readonly StudentFacingStaticCopyAuditSource[];
  ignoredLiterals?: readonly StudentFacingStaticCopyIgnoredLiteral[];
}): StaticCopyAuditResult {
  const registered = input.registered ?? STUDENT_FACING_STATIC_COPY;
  const auditedSources = input.auditedSources ?? STUDENT_FACING_STATIC_COPY_AUDIT_SOURCES;
  const ignoredLiterals = input.ignoredLiterals ?? STUDENT_FACING_STATIC_COPY_IGNORED_LITERALS;
  const registeredTexts = new Set(registered.map((entry) => normalizeCopyText(entry.text)));
  const ignored = new Set(
    ignoredLiterals.map((entry) => `${entry.source}\u0000${normalizeCopyText(entry.text)}`),
  );
  const audited = input.sources.filter((source) =>
    auditedSources.some((auditSource) => sourceMatchesAuditSource(source.source, auditSource)),
  );
  const candidates = audited.flatMap(extractStaticCopyLiteralCandidates);
  const unregistered = candidates.filter(
    (candidate) =>
      !registeredTexts.has(normalizeCopyText(candidate.text)) &&
      !ignored.has(`${candidate.source}\u0000${normalizeCopyText(candidate.text)}`),
  );
  return {
    auditedSourceCount: audited.length,
    candidateCount: candidates.length,
    unregisteredCount: unregistered.length,
    candidates,
    unregistered,
  };
}
